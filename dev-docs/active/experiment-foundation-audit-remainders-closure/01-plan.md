# 01 Plan

## Phase 0 — Census and invariant freeze

1. [x] Inventory every current promotion, bootstrap, attachment, retrieval and trust writer across shared contracts, HTTP routes, services, repositories and Prisma.
2. [x] Map existing capability flags, null-capable legacy schema, project-scope resolvers, structured lineage queries and relevant context contracts. Named-local row counts remain separately authorized database work.
3. [x] Freeze exact modification and prohibited-write allowlists.
4. [x] Convert EF-P06/P14/P15/P21 exit criteria into one runnable verification matrix.

Exit: met on 2026-08-02 in `06-phase0-census-and-freeze.md`; architecture and modification boundaries were reviewed and no code/config/schema/data change occurred.

## Phase 1 — EF-P14 bound bootstrap safety

1. Make active PaperProject plus exact active binding a server-resolved prerequisite.
2. Reject unbound bootstrap before any PI domain or outbox write.
3. Make bound bootstrap replay return the exact stored outcome.
4. Classify legacy null bindings explicitly and route them to a bounded recovery path; do not silently trust-upgrade or backfill.
5. Keep related admission capabilities default off until relational acceptance passes.

Exit: unbound, stale, cross-project and legacy-null negatives prove zero partial write; exact bound replay is idempotent.

## Phase 2 — EF-P06 atomic promotion/canonicalization

1. Define the typed primary command around admitted exact cells; callers cannot provide canonical ids or hashes.
2. Resolve, create or exact-reuse TaskSpecs and canonical assets on the server.
3. Commit promotion decision, canonical object, Candidate and outbox outcome atomically in the owning domain.
4. Prove crash-before/after-commit, duplicate delivery, same-key drift and concurrent promotion behavior.
5. Preserve T-131 history and close alternate promotion writers.

Exit: one canonical result and one durable event outcome converge under replay and concurrency; conflicts fail closed.

## Phase 3 — EF-P15 attachment and full revalidation

1. Resolve the Phase 0 architecture blocker first: current typed EF Runs/results are already PI-bound and legacy standalone rows are ineligible. Approve the recommended typed-exploration-spec attachment plus new PI-bound execution, or explicitly authorize a larger standalone typed lineage.
2. Introduce one explicit command from the approved typed standalone source to one exact Paper WorkOrder scope; never attach legacy output by identity.
3. Re-resolve project, Cycle, branch, revision, Run/cells where applicable, readiness, result hashes and validation at the owning boundary.
4. Reject cross-project, stale, incomplete, simulation-only, legacy and caller-substituted inputs.
5. Route any later eligible evidence only through the existing PI Evidence Trust Gateway.
6. Make repeated exact attachment idempotent and different-scope reuse a stable conflict.

Exit: standalone output remains non-paper-trusted; the approved attachment flow leads to a newly valid PI-bound lineage, and bypass/crash tests prove zero partial trust.

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
