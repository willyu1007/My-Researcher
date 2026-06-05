# 05 Pitfalls

## Do Not Repeat
- Do not assume the current system uses pgvector just because embeddings are stored in Postgres.
- Do not run unscoped retrieval as a scale test without bounding candidate chunks; the current JSONB path can fail before scoring.
- Do not replace JSONB vectors in one migration step; preserve rollback and parity with an additive native vector column first.
- Do not design pgvector around multiple embedding dimensions without an explicit profile/dimension policy.
- Do not bypass evidence activation or active embedding version semantics when adding DB-side vector search.
- Do not treat partial visual indexes as standard `INDEXED` completion during migration.
- Do not treat first-phase unscoped retrieval as a long-term unbounded performance guarantee.
- Do not switch first-phase primary storage to `halfvec(3072)` unless a later performance task explicitly accepts precision/parity tradeoffs.
- Do not use inner product on raw provider vectors; `<#>` requires normalized native vectors and query vectors.
- Do not make DB `candidate_limit` equal to user `top_k`; the service still needs rerank room for lexical, metadata, stale, and same-work logic.
- Do not cut over pgvector reads while active/evidence-ready versions have unresolved native vector quarantine or coverage gaps.
- Do not let native dual-write failures produce retrieval-active embedding versions.
- Do not keep automatic per-request JSONB fallback after canary; stable pgvector mode must remove that dual-track path.
- Do not relax coverage, quarantine, invalid-vector, or fallback-removal blockers during first-phase cutover.
- Do not leak pgvector SQL, `<#>` ordering, or raw JSONB vectors into the retrieval service/controller boundary.
- Do not call the migration complete while JSONB retrieval storage, fallback branches, rollback flags, or shadow-read-only runtime paths remain.
- Do not reuse the legacy `vector` field name for normalized pgvector retrieval storage; use `retrievalVector` and remove `vector Json` during final cleanup.
- Do not leave stable consumers of `LiteratureEmbeddingChunk.vector` unexamined; move retrieval consumers behind pgvector repository contracts before deleting JSONB storage.
- Do not store full vectors in migration quarantine records; record identifiers, issue codes, dimensions, norms, and compact diagnostics only.
- Do not let migration-only backfill/quarantine records survive as stable runtime state; remove their tables and code during final cleanup.
- Do not model pgvector rollout as multiple independent booleans; use one finite rollout mode and reject invalid transitions.
- Do not leave migration-only rollout mode/config, shadow/canary/fallback controls, or explicit JSONB rollback controls after final cleanup.
- Do not make backend selection, fallback, operator, dimension, field name, or norm gates long-term runtime configuration.
- Do not combine large-scale data migration with user-visible read-path cutover; Phase 3 is data migration and Phase 4 is cutover acceptance.
- Do not treat final cleanup as optional follow-up; Phase 5 is part of migration completion.
