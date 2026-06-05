# Roadmap

## Objective
- Prepare a pgvector-backed literature retrieval substrate that avoids late-stage migration pain as the adaptive LLM systems corpus grows toward thousands of papers.

## Milestone 1 - Design Signoff
- Document current JSONB-vector bottleneck.
- Decide native vector storage and dimension policy: first phase uses `vector(3072)`.
- Decide native vector field naming: migration column is `retrievalVector`, not a semantic reuse of legacy `vector`.
- Decide additive migration and rollback plan.
- Decide rollout/config lifecycle: finite migration mode first, stable pgvector tuning only after cleanup.
- Decide first-phase pgvector query shape and service rerank boundary.

## Implementation Phase 1 - Infrastructure Foundation
- Add `vector` extension support and nullable `retrievalVector vector(3072)` in repo-prisma SSOT.
- Add repository-scoped raw SQL skeleton for native vector writes/backfill and exact candidate retrieval.
- Add migration-only backfill run and quarantine issue tables.
- Add finite rollout mode storage/config with default mode `jsonb_only`.
- Add telemetry, norm validation helpers, candidate query tests, and temporary-Postgres migration verification.
- Do not change user-visible retrieval behavior in this phase.

## Implementation Phase 2 - Small-Scale Migration And Validation
- Backfill `retrievalVector` for a small representative set, including `LIT-0252` and a few standard fulltext records.
- Validate dimension, raw norm distribution, normalized norm, score drift, topK overlap, partial visual index behavior, and stale/evidence gates.
- Run `shadow_pgvector` only; user-visible retrieval remains JSONB.
- Use this phase to validate semantics and tooling, not throughput.

## Implementation Phase 3 - Large-Scale Data Migration
- Backfill all active/evidence-ready embedding versions.
- If final cleanup will make `retrievalVector` required, also backfill or clean up every retained `LiteratureEmbeddingChunk`.
- Enable dual-write and activation blockers so new embedding versions cannot become active with incomplete native vector coverage.
- Measure coverage, quarantine, throughput, retry, and recovery behavior.
- Do not switch user-visible read path in this phase.

## Implementation Phase 4 - Cutover Acceptance
- Promote rollout mode through `shadow_pgvector -> pgvector_canary -> pgvector_default`.
- Allow automatic JSONB fallback only in `pgvector_canary`; fallback count must be `0` before promotion.
- In `pgvector_default`, user-visible retrieval uses pgvector and has no automatic per-request JSONB fallback.
- Apply cutover gates for coverage, quarantine, data quality, parity, latency, candidate-window pressure, scoped/unscoped behavior, and partial visual index behavior.
- Keep explicit JSONB rollback only through stabilization and rollback drill evidence.

## Implementation Phase 5 - Final Cleanup And Legacy Removal
- Remove JSONB retrieval read path and JSONB vector column from the DB SSOT after stable pgvector gates pass.
- Keep `retrievalVector` as the final pgvector retrieval field and do not rename it to the legacy `vector` field name.
- Remove legacy JSONB retrieval repository/service code, fallback code, rollback flags, shadow-read-only code, and compatibility tests.
- Remove migration-only backfill/quarantine tables, repositories, services, and tests after cutover evidence is accepted.
- Remove migration-only rollout mode/configuration, shadow/canary/fallback settings, and explicit JSONB rollback controls.
- Regenerate DB context and task/governance artifacts after schema cleanup.
- Verify stable/default-on retrieval has a single pgvector path and no automatic per-request fallback.
- Treat this phase as part of the migration completion definition, not optional follow-up cleanup.

## Risks
- Prisma support for native vector columns requires an explicit `Unsupported(...)` plus raw-SQL boundary.
- Fixed `vector(3072)` dimensions can conflict with future embedding-profile changes.
- The first phase still makes Postgres compute exact inner products over the filtered candidate set.
- DB-side vector search must not bypass stale-index, active-version, or evidence-activation gates.
- Inner-product retrieval requires normalized native vectors; norm drift must fail migration or quarantine affected rows.
- A candidate window that is too small can drop lexical/metadata-strong literature before service rerank.
- Cutover must be blocked until native vector coverage and parity gates pass.
- Final cleanup must be blocked until stable pgvector mode has passed repeated gates and rollback drills.
- Large-scale backfill and user-visible read cutover must stay in separate phases to keep data coverage failures and retrieval behavior regressions diagnosable.
- Reusing the legacy `vector` name for normalized pgvector storage would blur raw provider-vector and retrieval-vector semantics.
- Migration-only run/quarantine records can become technical debt if they survive as stable runtime state.
- Multiple independent migration booleans can create invalid rollout combinations; use a finite mode instead.
- Future acceleration/index selection must be based on first-phase parity and performance evidence, not assumed in this design pass.

## Recommended Next Decision
- Convert this design into implementation work using the five implementation phases above.
- Start with Phase 1 only; user-visible retrieval must remain JSONB until Phase 4 cutover acceptance.
