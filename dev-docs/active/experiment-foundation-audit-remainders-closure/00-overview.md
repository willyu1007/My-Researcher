# T-134 Experiment Foundation Audit Remainders Closure

## Status

- State: in-progress
- Task ID: `T-134`
- Mapping: `M-001 > F-001 > R-012 > T-134`
- Origin: transferred from T-132 on 2026-07-30.
- Blocking relation: T-134 does **not** block T-132. T-132 retains only its personal PAI execution closure.
- Current phase: Phase 1 EF-P14 and Phase 2 EF-P06 are implemented and verified. Phase 3-4 implementation has not started.
- Next step: resolve and separately authorize the Phase 3 EF-P15 typed exploration-source model. Phase 3 remains implementation-blocked until that model is decided.

## Goal

Close exactly four previously open Experiment Foundation audit findings without broadening T-132:

| Finding | Owned outcome |
|---|---|
| EF-P06 / P0 | Typed, server-derived and atomic primary candidate promotion/canonicalization |
| EF-P14 / P2 | Bound PaperProject bootstrap plus safe legacy-null handling |
| EF-P15 / P1 | Explicit standalone-EF-to-WorkOrder attachment with full trust revalidation |
| EF-P21 / P1 | Project-scoped semantic retrieval with structured-lineage fallback and no third truth |

## Non-goals

- PAI job submission, collection or replay; those remain in T-132.
- Desktop UI or any change under `apps/desktop/` or `ui/`.
- Generalized provider onboarding, product packaging, tenant isolation, installation or managed-cloud operations.
- Trust promotion by semantic similarity, LLM summary or caller-authored hash.
- Replacing structured lineage, changing branch-head selection or creating a second evidence authority.

## Completion definition

- [x] EF-P14: unbound bootstrap fails before PI writes; bound bootstrap is idempotent; existing null-bound rows cannot enter bootstrap replay/project reads and receive the explicit `LEGACY_RECORD_NOT_ELIGIBLE` diagnostics-only classification.
- [x] EF-P06: a single server-owned transaction converges promotion decision, canonical asset, Candidate and outbox state; exact replay is zero-new and conflicts fail closed.
- [ ] EF-P15: standalone EF output remains non-paper-trusted until an explicit WorkOrder attachment re-resolves project, Cycle, revision, Run, readiness and validation identity; cross-project and bypass paths are zero-write rejected.
- [ ] EF-P21: authorization and project filters run before semantic ranking; deterministic lineage documents bind source revision/hash; stale hits are dropped; index failure falls back to structured lineage.
- [ ] The four paths reuse existing PI/EF authority boundaries and introduce no generic trust writer, manual internal ID/hash workflow or second truth.
- [ ] Required relational, API, regression, context and governance verification passes with capabilities default off.

## Constraints

- Implementation is not authorized by this planning package alone.
- Phase 0 authorization does not authorize Phase 1-4 product/schema/data work.
- Any persisted-field change follows the repo Prisma SSOT and `sync-db-schema-from-code`.
- Each workstream must preserve legacy immutability and prove zero partial writes on rejected or crashed operations.
- EF-P21 is backend retrieval only; presentation remains outside this task.

## Evidence baseline

- Source audit matrix: `dev-docs/archive/experiment-foundation-productization-closure/06-audit-closure-matrix.md`.
- Transfer decision: 2026-07-30 T-132 scope freeze.
- Current counts at transfer: 23 verified, 4 open, 1 cut.
- Phase 0 implementation freeze: `06-phase0-census-and-freeze.md`.
