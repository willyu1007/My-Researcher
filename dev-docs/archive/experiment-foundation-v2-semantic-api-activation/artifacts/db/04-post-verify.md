# Named-local post-verification

- `prisma migrate status`: 75 migrations found; database schema is up to date.
- Exact object census: all ten T-134 tables exist in `my_researcher_dev`.
- Data census: all ten newly added tables report zero live rows after apply.
- Semantic storage: `PaperImplementationSemanticDocumentProjectionV2.retrievalVector` is `vector(3072)` and `pi_semantic_projection_vector_hnsw_idx` exists.
- `prisma validate`: passed.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`: checksums current; DB context refreshed.
- `node .ai/tests/run.mjs --suite database`: passed; evidence cleaned.
- Capability flags remain unchanged/default-off.
