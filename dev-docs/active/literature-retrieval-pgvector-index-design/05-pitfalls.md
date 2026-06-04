# 05 Pitfalls

## Do Not Repeat
- Do not assume the current system uses pgvector just because embeddings are stored in Postgres.
- Do not run unscoped retrieval as a scale test without bounding candidate chunks; the current JSONB path can fail before scoring.
- Do not replace JSONB vectors in one migration step; preserve rollback and parity with an additive native vector column first.
- Do not design pgvector around multiple embedding dimensions without an explicit profile/dimension policy.
- Do not bypass evidence activation or active embedding version semantics when adding DB-side vector search.
- Do not treat partial visual indexes as standard `INDEXED` completion during migration.
