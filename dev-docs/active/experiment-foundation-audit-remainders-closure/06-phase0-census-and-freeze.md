# 06 Phase 0 Census and Implementation Freeze

## Authorization and effect boundary

- Authorized by the user on 2026-08-02: T-134 Phase 0 only.
- Phase 0 performed a read-only source/schema/test census and changed only T-134 documentation plus generated project-governance views.
- No product code, runtime configuration, Prisma schema, migration, local database, cloud resource or provider state was changed.
- A named-local count or repair of null-bound rows is outside the Phase 0 authorization. Any such database execution requires a separate EF-P14 apply authorization and identity-fenced plan.

## Plan-review verdict

Verdict: **conditionally ready for Phase 1**.

- EF-P14 is implementable without a schema change: the bootstrap service can require the already-paired bridge refs before calling the existing atomic repository transaction.
- EF-P06 requires additive typed Candidate/promotion-decision/outbox persistence. The current v2 schema contains canonical asset families but no typed product-preparation Candidate or promotion aggregate.
- EF-P21 requires a PI-owned rebuildable semantic projection. The only native vector storage today is literature-owned and must not become a cross-domain shortcut.
- EF-P15 is not implementation-ready as originally phrased. Every typed `ExperimentFoundationRunV2`, `TrainingTaskSpecV2`, `ExecutionAttemptV2` and `ExperimentResultV2` is already PI-bound, while legacy standalone rows are permanently ineligible under D-08. There is no eligible typed standalone output to attach. Phase 3 must not start until the product model chooses between a new typed standalone lineage and the safer “attach an exploration specification, then execute a new PI-bound Run” model.

The EF-P15 gap does not block Phase 1 or Phase 2. The source-model choice is a must-resolve architecture decision before Phase 3 implementation authorization.

## Current writer and read-path census

### EF-P14 — bound PaperProject bootstrap

| Layer | Current path | Phase 0 finding |
|---|---|---|
| Shared contract | `packages/shared/src/research-lifecycle/paper-implementation-contracts.ts` | Bootstrap requires bridge id/hash, but PaperProject refs remain nullable in stored DTOs. |
| HTTP | `POST /paper-implementation/projects/bootstrap` in `paper-implementation-routes.ts` | Existing product entrance; no v2 admission capability guard. |
| Service | `paper-implementation-intake-bootstrap-service.ts` | Validates active bridge/hash/source refs, then copies `target_paper_project_ref ?? null`; the service does not require the paired intake/target refs. |
| Upstream binding | `topic-selection-v1c-paper-project-bridge-service.ts` plus Prisma bridge repository | Creates PaperProject and attaches both refs as one exact pair; half-pairs are rejected and exact pairs replay. |
| Durable writer | `prisma-paper-implementation-repository.ts#createBootstrap` | One transaction creates intake snapshot and ImplementationProject; duplicate bridge replay is race-safe. The transaction currently accepts null target refs. |
| Prisma | bridge, intake snapshot and project target refs are nullable JSON | Nullability is required for retained history; product safety belongs at the service/repository entrance, not a destructive `NOT NULL` migration. |
| Existing tests | bootstrap service unit tests, route integration tests, Prisma repository tests | Happy replay, inactive/hash/source negatives and target-ref copying exist; unbound pair/half-pair/legacy-null product-path negatives are missing. |

Frozen decision P14-01: require both `paper_project_intake_ref` and `target_paper_project_ref`, validate their supported types and exact paired relationship, and reject before `createBootstrap` when either is absent or inconsistent.

Frozen decision P14-02: normal product behavior is reject-only for historical null-bound rows with stable `LEGACY_RECORD_NOT_ELIGIBLE` classification. T-134 will not silently backfill, infer or trust-upgrade them. A repair command is excluded unless separately designed and authorized later.

Frozen decision P14-03: keep the current route and repository UoW; do not introduce a second bootstrap endpoint, new table or late-binding writer.

### EF-P06 — typed primary promotion/canonicalization

| Layer | Current path | Phase 0 finding |
|---|---|---|
| Legacy HTTP | `POST /experiment-foundation/candidates/:candidate_id/promotion` | Caller supplies both request and result. With committed v2 cutover the legacy mutation guard returns `LEGACY_RECORD_NOT_ELIGIBLE`; the route must remain closed. |
| Legacy service/repository | `ExperimentFoundationService#decidePromotion` and `recordPromotionDecision` | Writes two generic records and updates a generic candidate. The legacy path creates no typed v2 canonical/Candidate/TaskSpec/outbox transaction. |
| Typed assets | `ExperimentFoundationV2Service` and `prisma-experiment-foundation-v2-repository.ts` | Five typed asset families support draft/freeze/readiness, but there is no product HTTP writer and no typed preparation Candidate or promotion-decision model. Existing import/fixture services are not product writers. |
| Exact materialization | `ExperimentFoundationV2MaterializationService#consume` and experiment-spine repository | Consumes `WorkOrderRevisionAdmitted`, server-validates exact cells/readiness and atomically creates VersionLock/Recipe/TaskSpecs/Run/inbox/outbox. The consumer is authoritative downstream materialization, not primary candidate promotion. |
| Prisma | typed asset and execution-spine models exist; only `EvidenceCandidateV2` exists | EF-P06 needs additive preparation Candidate and terminal promotion decision persistence; the preparation lane must not reuse the scientific EvidenceCandidate family. |

Frozen decision P06-01: add one v2 server-owned promotion command; never reopen or route through the legacy generic endpoint.

Frozen decision P06-02: callers provide a public candidate identity/revision, intended decision and idempotency key only. Canonical ids, canonical hashes, status/result objects, TaskSpec ids/hashes and outbox payloads are server-derived.

Frozen decision P06-03: the EF-owned UoW converges one terminal decision, one created-or-exact-reused canonical revision, the preparation Candidate transition and one outbox outcome. Rejection creates no canonical revision. Readiness, external side effects and scientific evidence remain outside the promotion transaction.

Frozen decision P06-04: downstream TaskSpecs remain materialized from an admitted exact WorkOrder cell plan by the existing materialization consumer. Promotion may prepare deterministic payload inputs but must not create post-admission scientific choices or duplicate the spine writer.

### EF-P15 — standalone-to-paper trust boundary

| Layer | Current path | Phase 0 finding |
|---|---|---|
| Typed EF scientific chain | `ExperimentResultV2` → `ScientificValidationReportV2` → `EvidenceCandidateV2` | Results require a real-provider succeeded `ExecutionAttemptV2` and an exact typed Run/cell/TaskSpec. |
| Typed execution schema | `RunV2`, `TrainingTaskSpecV2`, `ExecutionAttemptV2` | All carry non-null PI branch/revision/project/Cycle scope. A typed standalone Run cannot currently exist. |
| PI trust ingress | `PaperImplementationEvidenceTrustGatewayService` | Sole REU writer; re-resolves the qualified candidate/report and exact PI authority, rejects drift, then atomically writes inbox/REU/trace/outbox. |
| Legacy standalone surface | generic records and legacy execution rows | D-08/D-19 make them diagnostics-only and permanently ineligible for v2 trust or PI legacy flow. |
| Attachment command | none | No safe positive source type exists; adding an identity-only link would bypass execution and trust invariants. |

Frozen decision P15-01: no legacy result, simulation result, generic record or caller-authored envelope may be attached or converted into paper-trusted evidence.

Frozen decision P15-02: T-134 adds no alternative EvidenceCandidate or RunEvidenceUnit writer. Any future positive flow must terminate in the existing scientific-validation event and PI Evidence Trust Gateway.

Frozen decision P15-03: before Phase 3, choose and approve one model:

1. Recommended: attach a typed standalone exploration **specification** to a WorkOrder, then create and execute a new PI-bound Run; the prior standalone output remains diagnostic-only.
2. Larger alternative: introduce a separate typed standalone Run/Attempt/Result lineage and a cryptographically exact attachment/import boundary. The alternative requires a new authority model, migrations and substantially broader tests.

The plan adopts option 1 as the recommendation but does not authorize or pretend that its missing source aggregate already exists.

### EF-P21 — project-scoped semantic retrieval

| Layer | Current path | Phase 0 finding |
|---|---|---|
| Structured HTTP reads | three project/cycle/branch lineage GET routes | Project id is part of the route and service query. Scope mismatches map to opaque 404. |
| Structured service/repository | lineage v2 service plus Prisma repository | Reads ValidationCycles, current admitted revisions and acknowledged effective-head Runs deterministically; SQL/Prisma predicates include `implementationProjectId` before cross-domain resolution. |
| Semantic storage | none for PI | Literature owns the only `vector(3072)` column, embedding versions and HNSW query mechanics. The literature store is not a reusable truth table. |
| Semantic documents/index worker | none | No PI semantic schema, writer, ranking service or fallback endpoint exists. |

Frozen decision P21-01: the structured repository first resolves the authenticated project and produces the authorized current-cycle/current-effective-head candidate identities. Semantic ranking receives only that bounded candidate set; post-ranking project filtering is forbidden.

Frozen decision P21-02: deterministic server documents exist only for current ValidationCycle and current effective branch head. Historical revisions/Runs remain structured-only. Each document binds project id, source type/id/version/hash and a canonical document hash.

Frozen decision P21-03: every hit is re-resolved through structured lineage. Foreign, deleted, superseded, hash-drifted or no-longer-effective hits are dropped. Empty/partial/corrupt/unavailable index returns the structured result, not an error that blocks the product.

Frozen decision P21-04: use a PI-owned additive projection and repository. Literature embedding code may inform mechanical vector encoding/query patterns, but PI must not write literature tables or depend on literature domain identities.

## Implementation modification allowlist

The following is the maximum implementation surface. A phase may use fewer files. Adding another authority writer, domain or UI path requires a new review.

### Phase 1 allowlist — EF-P14

- `packages/shared/src/research-lifecycle/paper-implementation-contracts.ts` and its schema tests, only if stable error/response vocabulary changes.
- `apps/backend/src/services/paper-implementation-intake-bootstrap-service.ts` and unit tests.
- Existing PaperImplementation route/controller integration tests.
- Existing PaperImplementation and TopicSelection bridge repository tests for transaction/race evidence.
- OpenAPI/API index/process context only if the public error contract changes.
- No Prisma schema or migration is planned for Phase 1.

### Phase 2 allowlist — EF-P06

- A new, narrowly named shared v2 promotion contract and canonical-hash helpers.
- A new EF v2 promotion service/controller/route and repository interface/Prisma implementation.
- Additive Prisma models and migration for preparation Candidate, terminal promotion decision, idempotency and outbox only.
- Composition/capability parsing in `apps/backend/src/app.ts` and env contract updates; the new mutation flag defaults false and requires committed v2 cutover.
- Targeted unit, route, OpenAPI and disposable-PostgreSQL relational tests.
- Existing materialization service/repository may be changed only to consume the exact new event or prepared payload without acquiring promotion authority.

### Phase 3 allowlist — EF-P15, authorization pending at Phase 0 close

- A separately reviewed typed standalone exploration source contract/model selected by P15-03.
- One explicit attachment command/receipt owned by PI, with idempotency and exact scope binding.
- Existing EF scientific-validation read path and PI Evidence Trust Gateway only; no second trust writer.
- Additive schema/migration only after the source model is approved through `sync-db-schema-from-code`.

### Phase 4 allowlist — EF-P21

- A new PI semantic document/ranking contract and read service/route or additive query mode.
- A PI-owned repository and additive rebuildable document/vector projection schema/migration.
- An embedding adapter that reuses global gateway mechanics without importing literature repository/domain state.
- Existing structured lineage service/repository changes only for candidate enumeration and source re-resolution.
- OpenAPI/API index/context and deterministic/fallback/project-isolation tests.

### Prohibited implementation surface

- `apps/desktop/**`, `ui/**` and retired desktop compatibility styles.
- Legacy generic promotion/scientific/REU writers or any v2-to-legacy fallback.
- D19 fixture/import services as product routes or runtime writers.
- Literature tables as PI semantic storage.
- Caller-authored internal ids, hashes, validation status, canonical result or trust decision.
- Named-local database mutation, backfill, repair, cloud call or capability enablement without its own authorization.
- Any semantic-rank-driven branch head, readiness, promotion, attachment, EvidenceCandidate, REU or Cycle-closure transition.

## Runnable verification matrix

All targeted Node tests run from `apps/backend`; shared tests run from the repository root. Disposable PostgreSQL gates must create a nonce-bound database, apply migrations, verify the identity marker and clean up the database. A skipped relational case is not a pass.

| Phase | Required evidence | Named command/test target | Pass condition |
|---|---|---|---|
| 1 / P14 | Service zero-write and replay | `node --test --loader ts-node/esm src/services/paper-implementation-intake-bootstrap-service.unit.test.ts` | unbound/half-bound/stale/cross-scope/legacy-null reject before repository write; exact bound replay returns stored outcome |
| 1 / P14 | HTTP behavior | `node --test --loader ts-node/esm src/routes/paper-implementation-routes.integration.test.ts` | stable 4xx reason, opaque scope behavior and no created PI state on failure |
| 1 / P14 | Durable atomicity | targeted Prisma bootstrap relational test under nonce-bound `EXPERIMENT_V2_TEST_DATABASE_URL` | crash/unique race converges; intake/project/outbox counts are all-zero or exact-one |
| 2 / P06 | Contract/hash | new shared promotion schema/hash tests | extra/internal/hash/result fields reject; canonical bytes and ids are deterministic |
| 2 / P06 | Service/API | new promotion unit and route integration tests plus legacy cutover guard test | approve/reject/replay/key-drift/default-off/legacy-route behavior is exact |
| 2 / P06 | Durable UoW | new promotion relational test on disposable PostgreSQL | decision/canonical/Candidate/outbox is one atomic outcome under injected crash and concurrent replay |
| 2 / P06 | Spine regression | existing v2 materialization and relational suites | admitted exact cells still produce one Recipe/TaskSpec/Run lineage; no duplicate writer |
| 3 / P15 | Architecture prerequisite | approved P15-03 source-model decision and schema review | positive source is typed and non-legacy; output trust cannot be imported by identity only |
| 3 / P15 | Trust/bypass | scientific-validation and Evidence Trust Gateway unit suites plus new attachment tests | simulation/legacy/cross-project/stale/incomplete/caller-substituted inputs are zero-write rejected |
| 3 / P15 | Durable attachment | new disposable-PostgreSQL attachment relational test | exact replay converges; changed scope conflicts; only the existing gateway writes REU/trace/outbox |
| 4 / P21 | Structured scope | existing lineage service/route/repository tests | project predicates and opaque cross-project behavior remain intact |
| 4 / P21 | Ranking/fallback | new deterministic retrieval service tests | authorization precedes rank; ties deterministic; stale hits drop; absent/timeout/corrupt index returns structured results |
| 4 / P21 | Relational isolation | extended lineage relational test on disposable PostgreSQL | two-project fixture proves no foreign candidate reaches ranking or response |
| Each API/schema slice | Contract and context | backend/shared typecheck, OpenAPI drift/path coverage, `ctl-openapi-quality`, API-index verify; Prisma format/validate and DB context sync when schema changes | no type/drift/schema/context error |
| Each phase | Governance | strict task docs lint, project sync/lint and `git diff --check` | zero task-doc errors; only explicitly unrelated pre-existing warnings allowed |

Phase-specific tests are additive to impacted existing suites; a phase cannot replace relational/API evidence with in-memory coverage.

## Rollout and rollback freeze

| Phase | Rollout entrance | Rollback action | Preserved history |
|---|---|---|---|
| 1 / P14 | Existing bootstrap becomes stricter immediately | Revert the service guard only after a proven false rejection of a valid paired binding; never restore null-bound admission as a fallback | existing bridge/intake/project rows remain untouched |
| 2 / P06 | New mutation flag default false; enable only after relational and API gates | Disable flag and stop relay consumer; do not reopen legacy promotion or delete typed decisions/assets/events | immutable typed promotion outcomes remain readable |
| 3 / P15 | Separate default-off attachment flag after source-model approval | Disable command/consumer; keep diagnostic source and attachment receipts; gateway continues serving pre-existing qualified events | no REU deletion or result rebinding |
| 4 / P21 | Build projection, verify coverage, then expose semantic mode | Stop index worker/drop semantic mode and serve structured lineage only | structured source and workflow state are unchanged; projection can be rebuilt |

## Phase 0 exit and next authorization

- Writer/route/schema/test census: complete.
- Modification/prohibited-write allowlist: frozen.
- Named verification and rollback matrix: frozen.
- Product/schema/data/runtime effects: zero.
- Phase 1 EF-P14: ready for separate implementation authorization.
- Phase 2 EF-P06: architecture is bounded; additive schema work will require the Prisma SSOT workflow.
- Phase 3 EF-P15: blocked from implementation until P15-03 is explicitly decided.
- Phase 4 EF-P21: architecture is bounded; PI-owned projection and schema review are required.

Post-Phase0 resolution (2026-08-02): P15-03 option 1 was explicitly selected and Phase 3 implementation was authorized. The historical blocker above is resolved; the current contract and scope are recorded in `02-architecture.md` and `01-plan.md`. Option 2 remains unauthorized.
