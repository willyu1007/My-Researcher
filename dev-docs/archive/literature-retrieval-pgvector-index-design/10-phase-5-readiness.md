# Phase 5 Implementation Readiness Review

## Review Date
- 2026-06-06

## Decision
- Status: implementation-ready with a DB apply checkpoint.
- Approved execution order:
  1. remove runtime JSONB/shadow/canary/fallback/rollback retrieval paths.
  2. preserve only stable pgvector tuning needed by the retrieval path.
  3. remove raw JSONB vector write/read dependencies from embedding persistence.
  4. remove migration-only runner scripts, services, repositories, and tests.
  5. preview repo-prisma cleanup for legacy `vector Json` and migration-only tables.
  6. after explicit DB approval, apply schema cleanup and refresh DB context.
- Destructive schema application is not pre-approved by this review. The repo-prisma migration can be prepared and previewed, but dropping columns/tables on a target DB requires an explicit approval checkpoint.

## Current Evidence
- Approved target: `local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev`.
- Phase 4 live mode: `pgvector_default`.
- Phase 4 rollback drill: `PASS`.
- Phase 4 stable/default audit after rollback drill: `PASS`.
- Retained local corpus after historical cleanup:
  - `LiteratureRecord`: `151`.
  - evidence-ready literature records: `145`.
  - non evidence-ready literature records: `6`.
  - pgvector coverage for active/evidence-ready chunks: `24,773/24,773`.
  - open blocking vector quarantine: `0`.
  - orphan evidence/resource-sample references: `0`.

## Findings

### F1 - Runtime still keeps migration retrieval modes
- Severity: blocking for Phase 5 completion.
- Evidence:
  - `LiteratureRetrievalService.retrieveWithVectorRolloutEvidence` still supports `jsonb_only`, `shadow_pgvector`, `pgvector_canary`, `pgvector_default`, and `finalized`.
  - `LiteratureRetrievalService.retrieveFromJsonb` remains the JSONB vector retrieval authority.
  - `LiteratureRetrievalVectorSettingsService` still stores and validates migration mode transitions, including rollback.
- Required fix:
  - Public retrieval must call the pgvector candidate path directly.
  - Remove JSONB retrieval, shadow execution, canary fallback, explicit rollback mode handling, and rollout evidence APIs from stable runtime code.

### F2 - Stable pgvector tuning is coupled to migration rollout settings
- Severity: blocking for clean removal.
- Evidence:
  - Candidate window defaults, profile multipliers, per-literature caps, and timeout settings are currently resolved through the rollout settings service.
- Required fix:
  - Keep stable candidate-window tuning as ordinary pgvector retrieval configuration or service defaults.
  - Do not keep `jsonb_only`, `shadow_pgvector`, `pgvector_canary`, rollback transitions, or migration settings as runtime configuration.

### F3 - Embedding persistence still depends on legacy raw JSONB vectors
- Severity: blocking before schema drop.
- Evidence:
  - `LiteratureEmbeddingChunk.vector` is still required in repository domain records.
  - The content-processing runtime still writes raw chunk vectors and materializes native vectors from a fallback of artifact vector or chunk vector.
  - Prisma writes still persist `vector`.
- Required fix:
  - Persist normalized `retrievalVector` as the stable retrieval vector.
  - Remove service/repository/domain dependence on `LiteratureEmbeddingChunk.vector`.
  - Require embedding artifact vectors at snapshot persistence time so native vector materialization cannot silently fall back to legacy JSONB storage.

### F4 - Migration-only control-plane code remains in repo
- Severity: blocking for Phase 5 completion.
- Evidence:
  - Phase 2/3/4 runner scripts and backend runner services remain present.
  - Backfill/quarantine repository contracts and Prisma methods remain present.
  - Migration-only Prisma models `LiteratureEmbeddingVectorBackfillRun` and `LiteratureEmbeddingVectorQuarantineIssue` remain in the schema.
- Required fix:
  - Remove migration runner scripts/package commands and backend runner services/tests after preserving durable verification notes in the task package.
  - Remove migration-only repository contracts and Prisma methods.
  - Remove migration-only tables through repo-prisma cleanup after DB approval.

### F5 - Tests still preserve migration behavior as stable behavior
- Severity: blocking for verification credibility.
- Evidence:
  - Retrieval unit tests still assert JSONB default behavior, shadow parity, canary fallback, and stale pgvector fallback behavior.
  - Runner tests still validate migration-state behavior that should not survive final cleanup.
- Required fix:
  - Replace migration-mode tests with pgvector-only retrieval tests.
  - Add regression coverage proving stable retrieval does not load JSONB vectors or fallback to JSONB.
  - Keep evidence-ready, stale-policy, partial index, scoped/unscoped, same-work dedup, and candidate-window semantics covered on the pgvector path.

### F6 - DB cleanup is destructive and approval-gated
- Severity: blocking for DB apply, not for code cleanup.
- Evidence:
  - Final cleanup removes a column and migration-only tables from the repo-prisma SSOT.
- Required fix:
  - Produce a migration preview from `prisma/schema.prisma`.
  - Stop for explicit user approval before applying the destructive migration to any DB target.
  - After apply, run Prisma validate, DB context refresh, and governance sync/lint.

## Readiness Conclusion
- Phase 5 code cleanup can begin now.
- Phase 5 is complete only after runtime cleanup, tests, repo-prisma schema cleanup, DB context refresh, and governance verification pass.
- The implementation must not silently mutate the approved DB target with destructive drops before the explicit DB apply checkpoint.
