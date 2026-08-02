# T-134 Experiment Foundation Audit Remainders Closure

## Status

- State: in-progress
- Task ID: `T-134`
- Mapping: `M-001 > F-001 > R-012 > T-134`
- Origin: transferred from T-132 on 2026-07-30.
- Blocking relation: T-134 does **not** block T-132. T-132 retains only its personal PAI execution closure.
- Current phase: Phase 1 EF-P14, Phase 2 EF-P06, all Phase 3 EF-P15 slices and all Phase 4 EF-P21 slices are implemented and verified; the 2026-08-03 Phase 4 independent-review findings are remediated and regression-closed.
- Next step: discuss and authorize Phase 5 convergence, complete-writer census, context/governance verification and handoff. Structured lineage remains the complete fallback and control/trust authority.

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
- [x] EF-P15: standalone EF output remains non-paper-trusted until an explicit WorkOrder attachment re-resolves project, Cycle, revision, Run, readiness and validation identity; cross-project and bypass paths are zero-write rejected.
- [x] EF-P21: authorization and project filters run before semantic ranking; a post-search authoritative read fences concurrent source drift; exact vector-free coverage plus bounded ANN prevents partial ranking; database and provider deadlines fail open to complete structured lineage.
- [ ] The four paths reuse existing PI/EF authority boundaries and introduce no generic trust writer, manual internal ID/hash workflow or second truth.
- [ ] Required relational, API, regression, context and governance verification passes with capabilities default off.

## Phase 3 authorization — 2026-08-02

- Authorized model: P15-03 option 1 only — create a new immutable typed exploration specification, explicitly attach that specification to an exact PI WorkOrder scope, and execute a new PI-bound Run through the existing admission/materialization/scientific-validation/gateway chain.
- Rejected model: no standalone Run/Attempt/Result lineage, result import, identity-only attachment, legacy conversion or trust reuse.
- Authorization includes additive contracts, backend routes/services/repositories, Prisma SSOT schema and migration files, generated API/DB/env context, default-off capability wiring and disposable-PostgreSQL verification.
- Authorization excludes named-local/staging/production migration, backfill/repair, capability enablement, provider/cloud effects and desktop UI.

## Phase 4A authorization — 2026-08-03

- Authorized scope: deterministic current ValidationCycle/current effective-branch-head document contracts, server-derived source/document hashes, and a project-authorized structured candidate service that emits the only payload a later ranker may receive.
- The existing structured lineage reader must resolve the project before any Cycle/head enumeration. Historical revisions, non-effective heads and foreign-project identities are excluded from the candidate batch.
- Authorization includes shared schema/hash tests, backend service tests and T-134 documentation/governance sync.
- Authorization excludes Prisma schema/migration/projection storage, embedding or ranking provider calls, index workers, final retrieval HTTP, fallback/hit re-resolution, capability enablement, named database work, UI and every workflow/trust writer.

## Phase 4B authorization — 2026-08-03

- Authorized scope: one PI-owned rebuildable semantic document/vector projection, additive Prisma SSOT migration, repository implementations and an index rebuild service that consumes only Phase 4A-authorized documents.
- Embedding is an injected typed port. Phase 4B may validate and persist deterministic test vectors and profile metadata, but adds no real provider adapter, credentials, network call, scheduler or runtime composition.
- Projection replacement is project-scoped and atomic: exact replay is zero-change, stale documents are pruned only inside the same authorized project, and source/workflow rows remain untouched.
- Authorization includes reviewed migration SQL, generated DB context and nonce/marker/password-guarded disposable PostgreSQL application. It excludes named-local/staging/production apply, backfill, capability enablement, final retrieval/ranking HTTP, hit re-resolution/fallback, UI and all workflow/trust writers.

## Phase 4C authorization — 2026-08-03

- Authorized scope: one backend retrieval service that resolves the complete Phase 4A project-authorized document set before query embedding or vector ranking, queries only the Phase 4B PI projection, and deterministically ranks bounded hits.
- Every semantic hit must re-resolve against the exact current authorized document identity, source version/hash and document hash. Deleted, foreign, stale, superseded or duplicate hits cannot enter results.
- Index/provider timeout, unavailability, malformed query vectors, corrupt result rows or zero current semantic hits must return the complete structured candidate set with an explicit fallback reason. Structured lineage remains usable and authoritative.
- Authorization includes typed shared/service/repository contracts, injected deterministic test adapters, unit/regression tests, nonce-guarded disposable PostgreSQL read verification and T-134 documentation/governance sync.
- Authorization excludes real embedding/provider adapters, credentials/network calls, scheduler/runtime composition, capability enablement, HTTP/OpenAPI routes, schema migrations, named-local/staging/production database work, UI and every workflow/trust writer.

## Constraints

- Phase 3 implementation authority comes from the explicit 2026-08-02 user authorization and is limited to option 1 plus the boundaries above; the planning package alone grants no broader authority.
- Earlier Phase 0 authorization did not authorize Phase 1-4 product/schema/data work; each later phase still requires its own recorded authorization.
- Any persisted-field change follows the repo Prisma SSOT and `sync-db-schema-from-code`.
- Each workstream must preserve legacy immutability and prove zero partial writes on rejected or crashed operations.
- EF-P21 is backend retrieval only; presentation remains outside this task.

## Evidence baseline

- Source audit matrix: `dev-docs/archive/experiment-foundation-productization-closure/06-audit-closure-matrix.md`.
- Transfer decision: 2026-07-30 T-132 scope freeze.
- Current counts at transfer: 23 verified, 4 open, 1 cut.
- Phase 0 implementation freeze: `06-phase0-census-and-freeze.md`.
