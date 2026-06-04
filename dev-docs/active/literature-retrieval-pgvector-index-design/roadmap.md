# Roadmap

## Objective
- Prepare a pgvector-backed literature retrieval substrate that avoids late-stage migration pain as the adaptive LLM systems corpus grows toward thousands of papers.

## Milestone 1 - Design Signoff
- Document current JSONB-vector bottleneck.
- Decide native vector storage and dimension policy.
- Decide additive migration and rollback plan.
- Decide pgvector query shape and service rerank boundary.

## Milestone 2 - Migration Harness
- Build temporary-Postgres verification for:
  - `vector` extension creation.
  - native vector column migration.
  - backfill from JSONB vectors.
  - dimension validation.
  - index creation.

## Milestone 3 - Retrieval Cutover Prototype
- Add a repository method for bounded pgvector candidate retrieval.
- Preserve existing hybrid scoring and evidence activation gates.
- Compare JSONB and pgvector retrieval on fixed queries.

## Milestone 4 - Production-Safe Cutover
- Dual-write embeddings.
- Feature-flag pgvector retrieval.
- Run parity and performance gates.
- Keep JSONB fallback until repeated evidence passes.

## Risks
- Prisma support for native vector columns may require raw SQL or `Unsupported("vector")`.
- Fixed vector dimensions can conflict with future embedding-profile changes.
- Approximate indexes can change ranking behavior; parity tests must compare acceptable retrieval quality, not exact row order only.
- DB-side vector search must not bypass stale-index, active-version, or evidence-activation gates.

## Recommended Next Decision
- Accept additive migration as the default direction:
  - keep JSONB vector.
  - add pgvector column/index.
  - dual-write/backfill.
  - cut over retrieval after parity evidence.
