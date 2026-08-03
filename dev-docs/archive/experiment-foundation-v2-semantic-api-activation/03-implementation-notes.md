# T-135 Implementation Notes

## 2026-08-03 — task creation and governance prerequisite

- Created T-135 because explicit semantic HTTP/runtime composition and named-local activation were outside the frozen T-134 scope.
- T-106 and T-134 were archived after strict task-document lint and project-governance sync.
- The T-132 operator runbook now distinguishes its completed bounded live window from standing default-off product capability and records the diagnostic-only evidence boundary.
- No product code, capability, database, provider or cloud resource changed during task creation.

## 2026-08-03 — named-local migration activation

- Confirmed the repo-Prisma SSOT and exact loopback PostgreSQL 17.7 target before writes.
- Reviewed all four pending SQL files: ten additive tables plus indexes/constraints, with no drop, truncate, delete, rename, backfill or existing-row update.
- Created and TOC-verified a 363 MiB PostgreSQL 17 custom-format recovery dump with recorded SHA-256.
- Applied the four T-134 migrations through `prisma migrate deploy`; named-local is now current at 75/75.
- Verified all ten new tables at zero rows, the semantic HNSW index and exact `vector(3072)` column.
- Prisma validation, generated DB context refresh and the repository database suite passed.
- No capability flag, product row, provider, credential or cloud resource changed.

## 2026-08-03 — explicit semantic API composition

- Added closed shared retrieval request, rebuild response, embedding-profile and semantic error schemas.
- Added project-scoped rebuild and retrieval routes plus a thin controller with stable capability, validation, not-found, configuration and provider failure mappings.
- Added an application service that reuses the active `LiteratureContentProcessingSettingsService` embedding profile. The fixed projection accepts the native OpenAI `text-embedding-3-large` profile or an explicitly 3072-dimensional OpenAI profile; incompatible active profiles fail before project reads, provider calls or projection writes.
- Added one gateway adapter implementing both existing T-134 embedding ports. It reuses provider-safe batching and passes the retrieval abort signal into `BackendLlmGateway` with zero retries for the bounded query attempt.
- Extended the gateway embedding request with caller cancellation and made retry delay cancellation-aware; existing structured-output behavior is unchanged.
- Wired structured lineage, gateway, active settings and Prisma/in-memory projection repositories in `buildApp`.
- Added the default-false `PAPER_IMPLEMENTATION_SEMANTIC_RETRIEVAL_V2_ENABLED` env-contract key with committed-cutover and durable-composition guards. No environment value was enabled.
- Added OpenAPI operations and regenerated the API index, environment docs/context and context registry.

## Current state and follow-up

- Implementation and verification are complete; archive approval was granted on 2026-08-03.
- The landing commit stages exact T-135 paths and preserves pre-existing user-owned governance,
  Hook and skill changes outside the task scope.
- The archived bundle and landing commit retain the `Task: T-135` traceability link.
- Product rollout is separate: operators must explicitly enable the capability only with durable Prisma composition and a compatible active embedding profile.

## 2026-08-03 — quality review remediation opened

- A read-only review found that synchronous rebuilds had no same-process single-flight or caller
  cancellation, while the project lock began only after provider work. A slow old source snapshot
  could therefore replace a newer projection and concurrent retries could duplicate provider cost.
- The candidate service performed a serial per-Cycle lineage read, and retrieval performed the
  entire sequence twice outside the semantic deadline.
- Existing tests proved the T-134 units and default-off route behavior but did not exercise one
  enabled, non-empty HTTP flow through `buildApp`, active settings and the new embedding adapter.
- OpenAPI constrained complete structured fallback to 5000 items although the runtime contract and
  service deliberately return every authorized candidate when the semantic limit is exceeded.
- T-135 returned to `in-progress`. Phase 3 will fix these issues without a new database migration,
  real credentials, capability rollout or a background scheduler.

## 2026-08-03 — quality review remediation completed

- Added one in-flight rebuild per project in `PaperImplementationSemanticV2Service`. Concurrent
  callers share provider/index work; each caller may cancel independently, and the shared provider
  request is aborted only after the final waiter leaves. An application rebuild deadline maps to
  the explicit `SEMANTIC_REBUILD_TIMEOUT` API reason.
- Propagated `AbortSignal` through document embedding and `BackendLlmGateway`. Retry delay now
  responds to caller cancellation and provider work is not retried after an external abort.
- Added canonical authorized-source comparisons immediately before and after atomic replacement.
  A single bounded retry repairs a concurrent source change; persistent churn returns
  `SEMANTIC_SOURCE_DRIFT` instead of stale success.
- Replaced serial per-Cycle lineage calls with one repository method returning a complete project
  semantic snapshot. Prisma reads it under `REPEATABLE READ` with project-scoped bulk queries for
  cycles, closures, branches, head Runs and attempts; no provider call is held inside the DB
  transaction.
- Added an enabled, non-empty `buildApp` integration covering route/controller/service/settings,
  the shared embedding gateway adapter, projection replacement and semantic retrieval without a
  credential or network dependency.
- Added closed cancellation/timeout/drift reasons to the shared schema and OpenAPI error response,
  removed the incorrect 5000-item cap from complete structured fallback, and regenerated the API
  index.
- No new schema or migration was introduced. The capability remains default false and unrolled out.
