# 04 Verification

## Verification Log

### 2026-06-04 - Current Storage And Retrieval Evidence
- Status: completed.
- Commands:
  - `rg -n "pgvector|vector\\(|CREATE EXTENSION|ivfflat|hnsw|<->|<#>|<=>|Unsupported\\(\\\"vector" prisma apps packages -S`
  - `sed -n '480,520p' prisma/schema.prisma`
  - `sed -n '150,190p' apps/backend/src/repositories/prisma/literature/prisma-literature-embedding-store.ts`
  - `sed -n '150,260p' apps/backend/src/services/literature-retrieval-service.ts`
  - SQL check for `pg_extension` and `information_schema.columns`.
- Results:
  - No pgvector extension/query/index usage found in repo search.
  - `LiteratureEmbeddingChunk.vector` is defined as Prisma `Json`.
  - DB column `LiteratureEmbeddingChunk.vector` is `jsonb`.
  - Current DB has no installed `vector` extension.
  - Retrieval loads chunks via Prisma `findMany` and scores vectors in TypeScript.

### 2026-06-04 - Task Package Creation
- Status: completed.
- Created task package:
  - `.ai-task.yaml`
  - `roadmap.md`
  - `00-overview.md`
  - `01-plan.md`
  - `02-architecture.md`
  - `03-implementation-notes.md`
  - `04-verification.md`
  - `05-pitfalls.md`
- Pending:
  - governance lint after task package creation.

### 2026-06-04 - Governance Sync
- Status: completed.
- Command:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- Result:
  - Sync completed.
  - `T-121` registered in project hub.
  - Derived views regenerated:
    - `.ai/project/main/registry.yaml`
    - `.ai/project/main/dashboard.md`
    - `.ai/project/main/feature-map.md`
    - `.ai/project/main/task-index.md`

### 2026-06-04 - Governance Lint
- Status: completed.
- Command:
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Lint passed.

### 2026-06-05 - Storage And Prisma Boundary Decision Notes
- Status: completed.
- Command:
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design/01-plan.md dev-docs/active/literature-retrieval-pgvector-index-design/02-architecture.md dev-docs/active/literature-retrieval-pgvector-index-design/03-implementation-notes.md`
- Result:
  - Diff whitespace check passed.
  - No schema or product code changes were made.

### 2026-06-05 - First-Phase Exact Retrieval Boundary
- Status: completed.
- Decision:
  - First phase is exact DB-side native vector candidate retrieval only.
  - Future acceleration/index selection is deferred until first-phase parity and performance evidence exists.
  - The known first-phase bottleneck is documented: Postgres still computes exact similarity over the filtered candidate set.
- Commands:
  - `rg -n "HNSW|IVFFlat|ivfflat|hnsw|vector\\(3072\\)|Unsupported\\(\\\"vector|Pending final whitespace|approximate|Approximate" dev-docs/active/literature-retrieval-pgvector-index-design`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - No concrete acceleration/index option remains in first-phase design text; remaining matches are historical or QA command text.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Unscoped Retrieval Boundary
- Status: completed.
- Decision:
  - First phase keeps unscoped retrieval as a bounded compatibility path.
  - Scoped retrieval is the predictable-performance path.
  - Degradation thresholds for unscoped retrieval must be chosen from first-phase measurements.
- Expected future evidence:
  - filtered candidate count.
  - DB exact similarity-query latency.
  - scoped and unscoped P50/P95.
  - retrieval parity against the JSONB path.
- Commands:
  - `rg -n "add native vector storage and index|column/index|add pgvector column/index|HNSW|IVFFlat|ivfflat|hnsw|vector\\(3072\\)|Unsupported\\(\\\"vector|Pending final whitespace|approximate|Approximate|unbounded|unscoped" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Unscoped retrieval is documented as bounded compatibility behavior, not an unbounded first-phase guarantee.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Native Vector Type And Dimension
- Status: completed.
- Decision:
  - First phase uses `vector(3072)` as the native pgvector column type.
  - The native column stores L2-normalized vectors.
  - Prisma schema should represent the column as `Unsupported("vector(3072)")`.
  - JSONB vector storage remains the raw parity and rollback source during migration.
- Expected future evidence:
  - temporary Postgres migration creates the `vector` extension.
  - migration can create a nullable `vector(3072)` column.
  - representative 3072-dimensional vectors can be normalized, inserted, and queried with inner product.
  - dimension mismatch fails during backfill or write-path validation.
- Commands:
  - `rg -n "Unsupported|type/dimension|native type|dimension|3072|halfvec|vector\\(" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - First-phase type/dimension decision is documented as `vector(3072)`.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Inner Product And Norm Policy
- Status: completed.
- Decision:
  - First phase uses pgvector `<#>` for DB-side exact candidate ordering.
  - Native `vector(3072)` values are L2-normalized.
  - JSONB `vector` remains the raw provider vector for rollback and parity.
- Expected future evidence:
  - raw vector norm distribution.
  - native `vector_norm(...)` near `1`.
  - zero-norm, non-finite, wrong-dimension, and abnormal-norm counts.
  - score drift between JSONB `normalizedCosine` and native inner-product mapping.
  - topK overlap and rank drift for scoped and unscoped fixed queries.
- Commands:
  - `rg -n "<#>|<=>|cosine|inner product|normalized|vector_norm|l2|L2|distance" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Inner-product retrieval and norm gates are documented for the first phase.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Candidate Window And Rerank Policy
- Status: completed.
- Decision:
  - First phase uses an internal candidate window derived from `top_k`, `evidence_per_literature`, retrieval profile, and scoped/unscoped mode.
  - Default formula is documented with profile multipliers, floor, scoped/unscoped ceilings, and per-literature cap.
  - Second-phase alternatives are recorded without changing the first-phase implementation boundary.
- Expected future evidence:
  - `candidate_limit`, `candidate_returned`, `candidate_limit_hit`, and `per_literature_candidate_cap`.
  - scoped/unscoped DB similarity-query latency.
  - candidate window hit rate and post-rerank drop rate.
  - final topK overlap and rank drift against JSONB full-rerank baseline.
- Commands:
  - `rg -n "candidate_limit|per_literature_candidate_cap|profile_multiplier|top_k|evidence_per_literature|rerank window|Second-phase|second-phase" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Candidate window policy and second-phase alternatives are documented.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Migration Cutover State Machine
- Status: completed.
- Decision:
  - First phase uses staged cutover: `schema_prepare -> backfill -> dual_write -> shadow_read_parity -> feature_flag_cutover -> stabilization`.
  - Backfill invalid rows are quarantined/reported and block affected cutover instead of being silently skipped.
  - New embedding versions cannot become retrieval-active with incomplete native vector coverage.
  - Automatic JSONB fallback is canary-only and must be removed before stable/default-on pgvector mode.
  - JSONB remains the explicit feature-flag rollback source during first-phase cutover.
- Expected future evidence:
  - native vector coverage for active/evidence-ready versions.
  - quarantine row count and affected literature/version IDs.
  - dual-write success/failure counts.
  - shadow-read parity results.
  - feature-flag state, canary fallback count, and canary fallback reasons.
  - stable/default-on audit proving no automatic per-request JSONB fallback path remains.
  - rollback drill showing explicit feature-flag switch returns reads to JSONB without data deletion.
- Commands:
  - `rg -n "schema_prepare|backfill|dual_write|shadow_read|feature_flag|fallback|rollback|quarantine|coverage|cutover" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Migration cutover state machine and rollback guardrails are documented.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Fallback Lifetime
- Status: completed.
- Decision:
  - Automatic per-request JSONB fallback is migration-only.
  - Canary cutover may use automatic fallback as an observable safety net.
  - Any canary fallback blocks promotion.
  - Stable/default-on pgvector mode must remove fallback code/config/test paths.
  - Long-term rollback is explicit feature-flag rollback, not automatic dual-track fallback.
- Expected future evidence:
  - canary fallback count and reasons.
  - promotion gate requiring zero fallback events.
  - stable/default-on audit showing no automatic per-request fallback path.
  - rollback drill through explicit feature flag.
- Commands:
  - `rg -n "fallback|feature-flag rollback|feature_flag|canary|stable/default-on|automatic per-request|dual-track" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Fallback is documented as migration/canary-only.
  - Stable/default-on mode requires fallback removal.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Final Cleanup And Legacy Removal
- Status: completed.
- Decision:
  - Migration is not complete until JSONB retrieval storage and runtime dual-track content are removed.
  - Final cleanup runs only after stable/default-on pgvector mode passes repeated gates and rollback drill evidence exists.
  - After cleanup, pgvector is the single retrieval authority; JSONB retrieval rollback is no longer retained at runtime.
- Expected future evidence:
  - schema cleanup removes the JSONB retrieval vector column/field.
  - repository/service code no longer has JSONB retrieval fallback branches.
  - automatic fallback, explicit rollback flag, and shadow-read-only code are removed.
  - stable tests assert no JSONB retrieval path exists.
  - DB context and governance artifacts are regenerated after cleanup.
- Commands:
  - `rg -n "finalize_cleanup|Final Cleanup|legacy|dual-track|JSONB retrieval|rollback flag|shadow-read-only|single retrieval authority|stable tests" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Final cleanup is documented as required terminal work, not optional follow-up.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Cutover Gate Thresholds
- Status: completed.
- Decision:
  - Coverage, data quality, and fallback gates are hard blockers.
  - Parity and performance gates use conservative initial thresholds.
  - Parity/performance thresholds may be adjusted once after shadow-read evidence, but hard blockers are not adjustable in first-phase cutover.
- Hard blockers:
  - active/evidence-ready native vector coverage is `100%`.
  - active/evidence-ready quarantine rows are `0`.
  - wrong-dimension, NaN, Infinity, and zero-norm counts are `0`.
  - canary automatic fallback count is `0`.
  - stable/default-on implementation has no automatic per-request JSONB fallback path.
- Initial thresholds:
  - native norm tolerance: `abs(norm - 1) <= 1e-5`, relaxable to `1e-4` only with recorded shadow evidence.
  - score drift: P95 `<= 1e-4`, max `<= 1e-3`.
  - topK overlap: scoped `>= 0.9`, unscoped `>= 0.8`.
  - `candidate_limit_hit` above `20%` across repeated shadow queries blocks default-on rollout.
  - pgvector P95 no higher than `0.7x` JSONB P95 when JSONB baseline is measurable.
- Commands:
  - `rg -n "100%|1e-5|1e-4|1e-3|0\\.9|0\\.8|20%|0\\.7x|candidate_limit_hit|score drift|topK overlap|hard blocker|Cutover Gates" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Cutover gate thresholds are documented.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Repository And Service Boundary
- Status: completed.
- Decision:
  - Repository owns pgvector SQL/operator behavior and bounded candidate retrieval.
  - Service owns active/evidence-ready resolution, query normalization, hybrid rerank, parity, and cutover orchestration.
  - Pgvector path must not return raw JSONB vectors to the service.
- Expected future evidence:
  - repository method contract includes normalized query vector, candidate window, and per-literature cap.
  - repository method returns bounded candidates, vector score, inner-product diagnostic value, and telemetry.
  - service tests prove lexical/metadata/stale/same-work/evidence grouping remain service-owned.
  - pgvector read path does not load raw JSONB vectors into Node.
- Commands:
  - `rg -n "Repository And Service Boundary|candidate-query telemetry|raw JSONB vectors|inner-product diagnostic|candidate_limit|per_literature_candidate_cap|pgvector SQL|<#>" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Repository/service boundary is documented.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Final Schema Field Naming
- Status: completed.
- Decision:
  - Native pgvector retrieval storage is named `retrievalVector`.
  - Migration uses nullable `retrievalVector Unsupported("vector(3072)")?`.
  - Final cleanup removes legacy `vector Json` and keeps required `retrievalVector Unsupported("vector(3072)")`.
  - The legacy `vector` name is not reused for normalized retrieval storage.
- Expected future evidence:
  - Prisma schema diff shows `retrievalVector` added before cutover and `vector Json` removed during final cleanup.
  - code search proves stable retrieval no longer reads `LiteratureEmbeddingChunk.vector`.
  - repository/service contracts expose bounded pgvector candidates rather than raw JSONB vectors.
- Commands:
  - `rg -n "retrievalVector|vector Json|LiteratureEmbeddingChunk\\.vector|Unsupported\\(\\\"vector\\(3072\\)\\\"\\)" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Final schema field naming is documented.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Migration-Only Durable Artifacts
- Status: completed.
- Decision:
  - Backfill/quarantine records are allowed only as migration control-plane artifacts.
  - Run-level and row-level issue records support resumable backfill, repair, coverage gates, and activation blocking.
  - Full vector payloads are not stored in quarantine records.
  - Stable/default-on pgvector mode must not read migration issue tables.
  - Final cleanup removes migration-only tables and runtime code, or exports a static report and deletes runtime tables.
- Expected future evidence:
  - migration schema includes run and issue records only in the migration window.
  - cutover evidence shows active/evidence-ready native coverage is `100%` and open blocking issues are `0`.
  - stable cleanup diff removes migration-only repositories/services/tests.
  - new embedding vector failures after cleanup use the normal indexing/job error path.
- Commands:
  - `rg -n "migration-only|BackfillRun|QuarantineIssue|quarantine issue|durable artifacts|runtime tables|normal indexing/job error path" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Migration-only durable artifacts are documented as temporary control-plane records.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Rollout And Configuration Lifecycle
- Status: completed.
- Decision:
  - Pgvector cutover uses one finite rollout mode instead of multiple independent booleans.
  - Allowed modes are `jsonb_only`, `shadow_pgvector`, `pgvector_canary`, `pgvector_default`, and `finalized`.
  - Automatic JSONB fallback is valid only in `pgvector_canary`.
  - Explicit JSONB rollback is valid only before `finalized`.
  - Final cleanup removes migration rollout/config controls and retains only stable pgvector tuning.
- Expected future evidence:
  - mode transition tests reject invalid states.
  - canary fallback count is `0` before `pgvector_default`.
  - cleanup diff removes rollout mode storage/config, shadow/canary/fallback settings, and explicit JSONB rollback controls.
  - stable config contract contains only pgvector tuning parameters.
- Commands:
  - `rg -n "jsonb_only|shadow_pgvector|pgvector_canary|pgvector_default|finalized|rollout mode|migration-only rollout|stable pgvector tuning|explicit JSONB rollback" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Rollout/config lifecycle is documented as finite migration mode plus stable pgvector tuning.
  - Diff whitespace check passed.
  - Governance lint passed.

### 2026-06-05 - Implementation Phase Boundaries
- Status: completed.
- Decision:
  - Implementation is split into five phases: infrastructure foundation, small-scale migration and validation, large-scale data migration, cutover acceptance, and final cleanup.
  - Phase 3 is data migration only and must not switch user-visible reads.
  - Phase 4 owns read-path cutover and acceptance gates.
  - Phase 5 is mandatory migration completion work, not optional cleanup.
- Expected future evidence:
  - Phase 1 tests prove schema/raw-SQL scaffolding without behavior change.
  - Phase 2 evidence covers `LIT-0252` and representative fulltext records in `shadow_pgvector`.
  - Phase 3 evidence covers broad coverage, quarantine, retry, recovery, dual-write, and activation blockers.
  - Phase 4 evidence covers rollout mode transitions, fallback count `0`, parity, latency, candidate-window pressure, scoped/unscoped behavior, and partial visual index behavior.
  - Phase 5 cleanup diff removes JSONB retrieval, migration controls, migration artifacts, and compatibility tests.
- Commands:
  - `rg -n "Implementation Phase|Phase 1|Phase 2|Phase 3|Phase 4|Phase 5|large-scale data migration|read-path cutover|definition of done|migration completion" dev-docs/active/literature-retrieval-pgvector-index-design -S`
  - `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - Implementation phase boundaries are documented.
  - Diff whitespace check passed.
  - Governance lint passed.
