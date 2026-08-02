# 03 Implementation Notes

## 2026-07-30 — Task creation and scope transfer

- Created T-134 as the independent owner of EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21.
- The latest user decision supersedes the older T-132 statement that these findings had to close inside T-132. Their transfer is explicit, so they no longer block T-132.
- Workstream order starts with EF-P14 because current bootstrap behavior can persist a null PaperProject binding; admission must remain default off until that boundary has relational evidence.
- EF-P06 owns the atomic typed promotion/canonicalization path; EF-P15 owns standalone attachment plus full revalidation; EF-P21 owns backend semantic retrieval with structured fallback.
- Desktop UI is excluded from all four workstreams. EF-P21 does not include screens, forms, renderer navigation or DOM/Electron tests.
- Package creation changed no code, configuration, schema, database or cloud state.

## Open implementation decisions

- EF-P15 source model remains open and blocks Phase 3 only. Recommended choice: attach a typed exploration specification, then execute a new PI-bound Run; do not trust-reuse prior output.
- Exact embedding provider/profile and vector dimension for EF-P21 remain a Phase 4 implementation detail, but storage ownership and structured-first filtering are frozen.

## 2026-08-02 — Phase 0 census and implementation freeze

- Completed the shared contract, HTTP, service, repository, Prisma, capability and test census without product/schema/data/runtime effects.
- Froze EF-P14 to a service/repository entrance guard using the existing paired bridge refs and existing atomic bootstrap transaction; no schema migration is planned.
- Froze legacy-null behavior to `LEGACY_RECORD_NOT_ELIGIBLE` reject-only. No named-local census, backfill or repair was run.
- Confirmed the legacy EF promotion route remains closed after v2 cutover and that typed v2 has canonical assets/materialization but no preparation Candidate/promotion aggregate. EF-P06 therefore requires a new additive typed UoW and default-off entrance.
- Confirmed all current typed v2 scientific results are already PI-bound. The census invalidates the original assumption that an eligible typed standalone output already exists and creates a mandatory Phase 3 architecture decision.
- Confirmed PI structured lineage already filters by project in repository queries and that the only native vector table is literature-owned. EF-P21 must own a separate rebuildable projection and rank only pre-authorized candidates.
- Recorded the complete modification allowlist, prohibited surface, named verification matrix and rollback table in `06-phase0-census-and-freeze.md`.

## 2026-08-02 — Phase 1 EF-P14 bound bootstrap safety

- Changed `paper-implementation-intake-bootstrap-service.ts` only at the service business boundary. New bootstrap validates paired handoff/bridge refs before creating ids, hashes or calling the repository.
- Exact binding requires `paper_project_intake` plus `paper_project` ref types, non-empty identities, matching title-card id, exact bridge payload hash and byte-equivalent handoff/embedded-bridge refs.
- Bound bootstrap stores the validated target ref in the snapshot hash, ImplementationProject and intake snapshot; exact replay still returns the existing repository outcome.
- Existing project replay and project reads now validate stored project/snapshot/source-handoff parity. Null-bound history is rejected as `LEGACY_RECORD_NOT_ELIGIBLE` with diagnostics-only recovery and is never rewritten.
- Updated only three test fixtures that instantiate the bootstrap service so their normal path represents a completed upstream PaperProject intake. Prisma repository null fixtures remain unchanged to preserve historical-null storage coverage.
- Added service tests for zero-write unbound/half-bound/type/title/hash/mirror failures and legacy replay/read rejection; added real HTTP coverage for the stable unbound error envelope; retained contract-suite and Prisma race regressions.
- No route, controller, shared request/response contract, repository implementation, Prisma schema, migration, local data, capability flag or cloud state changed.

## 2026-08-02 — Phase 2 EF-P06 atomic typed promotion

- Added a narrow shared promotion request/response/event contract and deterministic server hash/id helpers. Strict schemas reject extra/internal/canonical/result/TaskSpec/outbox fields.
- Added route → controller → service → repository layering for one v2 product promotion command. The legacy generic promotion route remains guarded by committed cutover and was not reused or reopened.
- Reused exact typed asset drafts as the preparation source and the existing five canonical revision families as the catalog target. The product command snapshots the exact draft Candidate revision inside its transaction; no generic record writer or D19 fixture/import route was introduced.
- Extended the EF v2 in-memory and Prisma repositories with one promotion UoW covering Candidate, terminal decision, idempotency receipt, typed canonical create/reuse and promotion outbox. A Candidate-revision PostgreSQL advisory transaction lock serializes concurrent terminal resolution.
- Added four additive Prisma models plus migration `20260802150000_add_experiment_foundation_promotion_v2`; the SQL includes terminal status/ref pairing, one-decision-per-Candidate-revision, idempotency and outbox uniqueness constraints.
- Added `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` to the env SSOT with default `false` and committed-cutover composition validation. The flag was not enabled in any environment.
- Updated OpenAPI/API index, DB context and env artifacts from their SSOTs. No named-local/staging/production migration, backfill, repair, provider call or UI change occurred.
- Added shared hash/schema, service, route, cutover and disposable-PostgreSQL tests. Existing admitted-cell materialization remains the only TaskSpec/Run writer and was changed by zero lines.

## 2026-08-02 — Phase 2 quality hardening

- Connected the promotion outbox to the existing integration relay scheduler with lease/ack/release/fail lifecycle support in both repository implementations. The event is acknowledged as an audit-only terminal notification and creates no downstream domain state.
- Strengthened durable replay reads so deterministic Candidate identity, exact canonical logical id/content, decision id/command hash/outcome, receipt binding and outbox ids/aggregate/envelope/payload must all agree. Claim-time corruption is terminalized instead of retried forever.
- Expanded service and disposable-PostgreSQL coverage from the original DataPolicy-centered path to exact canonical reuse across DataPolicy, Dataset, MetricDefinition, Benchmark and EvaluationProtocol.
- Hardened the runtime request boundary against non-string idempotency keys and added `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` to the node-test environment scrub list.
- The hardening pass required no Prisma schema, migration, API shape, env SSOT, named database, enabled capability, provider or UI change.
