# 03 Implementation Notes

## 2026-07-30 — Task creation and scope transfer

- Created T-134 as the independent owner of EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21.
- The latest user decision supersedes the older T-132 statement that these findings had to close inside T-132. Their transfer is explicit, so they no longer block T-132.
- Workstream order starts with EF-P14 because current bootstrap behavior can persist a null PaperProject binding; admission must remain default off until that boundary has relational evidence.
- EF-P06 owns the atomic typed promotion/canonicalization path; EF-P15 owns standalone attachment plus full revalidation; EF-P21 owns backend semantic retrieval with structured fallback.
- Desktop UI is excluded from all four workstreams. EF-P21 does not include screens, forms, renderer navigation or DOM/Electron tests.
- Package creation changed no code, configuration, schema, database or cloud state.

## Open implementation decisions

- EF-P15 source model was resolved on 2026-08-02: option 1 typed exploration specification plus a new PI-bound execution is authorized. The larger standalone execution lineage is rejected for T-134.
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

## 2026-08-02 — Phase 3 EF-P15 authorization

- Reused T-134 (`REUSE_TASK`, `M-001 > F-001 > R-012 > T-134`); no new task or project mapping is needed.
- Authorized only P15-03 option 1. The positive source is a new immutable typed EF exploration specification whose proposed branch frame, WorkOrder snapshot and exact cells become PI authority only through an explicit attachment/admission command.
- The attachment receipt and normal v2 admission bundle/outbox must commit atomically in PI. The existing cross-domain relay then materializes a new PI-bound Run; attachment itself writes no TaskSpec, Run, result, validation, EvidenceCandidate, REU or trust trace.
- Full revalidation is split by ownership: attachment checks exact spec/project/Cycle/branch/assets/readiness; existing EF materialization checks exact parity; the new execution's result and validation are checked by existing scientific services; the existing PI Evidence Trust Gateway alone admits evidence.
- Phase 3 implementation is authorized in slices 3A source aggregate, 3B atomic PI attachment/admission and 3C end-to-end trust/bypass verification. Additive Prisma migration files and generated context are in scope; applying them to a named database, enabling capabilities or calling providers is not.

## 2026-08-02 — Phase 3A immutable exploration specification

- Added a closed shared v1 content/request/response contract and canonical hash/id profiles for one versioned EF exploration specification. Existing typed PI branch-frame, WorkOrder snapshot, exact-cell and asset-ref schemas are reused rather than forked.
- Added route, controller and service layers plus dedicated in-memory and Prisma repositories. Service-boundary validation rejects duplicate cell keys, parameter names and asset dependencies even when HTTP/AJV validation is bypassed.
- Implemented exact-content reuse before CAS, same-key command binding, monotonically increasing revisions for changed content and transactional crash rollback. Server-owned and downstream authority fields are rejected before business logic.
- Added three additive Prisma models and migration `20260802203000_add_exploration_spec_v2` for identity, immutable revision and command receipt. The transaction contains no outbox or PI foreign key; those belong to Phase 3B.
- Added fail-closed durable integrity checks for deterministic identity, revision, receipt and content bindings. A Phase 2 promotion foreign-key name uncovered by full-history drift replay was shortened and pinned in both its existing migration and Prisma schema.
- Added the default-false `EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED` env contract and committed-cutover composition guard. The flag remains disabled everywhere.
- Updated OpenAPI/API index, DB context and env artifacts from their SSOTs. No named-local/staging/production database, provider/cloud operation, UI, TaskSpec, Run, result, validation or evidence writer was changed.

## 2026-08-02 — Phase 3B atomic PI exploration attachment

- Added the closed attachment contract, deterministic command hash/attachment/receipt ids, HTTP controller/route and an orchestration service that performs exact spec resolution, replay-before-readiness and exact readiness revalidation.
- Extended the existing PI admission UoW rather than creating a second admission path. In-memory and Prisma repositories atomically persist attachment and receipt with branch/revision/cells/admission/outbox and revalidate every stored cross-binding on read.
- Added two PI-owned additive tables in migration `20260802220000_add_pi_exploration_attachment_v2`. Composite foreign keys bind project/Cycle/branch, revision/approved-plan, admission and receipt/attachment parity; EF refs remain scalar to preserve domain ownership.
- Added a standalone additive repository port for attachment replay so existing admission users and test doubles remain unchanged.
- Added default-false `PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED`; startup requires committed cutover and ordinary admission, while Phase 3A authoring may remain disabled.
- Updated OpenAPI/API index, Prisma DB context and env generated artifacts. No named database was migrated, no capability was enabled and no provider/UI/TaskSpec/Run/result/validation/evidence writer changed.

### Phase 3C continuation

1. Drive the ordinary `WorkOrderRevisionAdmitted` relay/materialization path from a committed 3B attachment and prove exact cell/asset/readiness parity before a new PI-bound Run exists.
2. Prove prior exploratory output, legacy/simulation identities and caller-substituted authority cannot enter result, validation or evidence paths.
3. Route only the newly executed PI-bound lineage through existing scientific validation and Evidence Trust Gateway writers, with crash/replay/bypass zero-partial-trust assertions.
