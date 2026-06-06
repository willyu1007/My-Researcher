# Phase 2 Generated Artifact Index

## Storage Policy
- Large generated JSON artifacts are stored under `.ai/.tmp/` and are not intended for git tracking.
- This index keeps the stable review evidence: path, checksum, summary, and regeneration commands.
- The durable task package keeps small contracts, summaries, and verification notes under `dev-docs/`.

## Temporary Artifacts

| Artifact | Temporary Path | Lines | SHA-256 | Summary |
|---|---:|---:|---|---|
| Shadow query set v1 | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase2-readiness/shadow-query-set-phase2-target-local-20260605.json` | 15473 | `27305af208c1c28f7d747e5143e815e61ba2c20d615bc8439ae902f77ef77504` | schema v1, 5 queries |
| Shadow query set v2 | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase2-readiness/shadow-query-set-phase2-target-local-20260605-v2.json` | 15474 | `1e1fc6d9fbaab34d58972867b782918e986715680eb6661e5ac2afef918fcc34` | schema v1, 5 queries, `q_unscoped_bounded.evidence_per_literature=5` |

## Query IDs
- `q_lit_0252_visual_scoped`
- `q_standard_semantic_scoped`
- `q_metadata_lexical`
- `q_stale_default_excluded`
- `q_unscoped_bounded`

## Regeneration Notes
- Use the active OpenAI embedding profile to regenerate query vectors.
- Then rerun:
  - `pnpm literature:pgvector:phase2 -- --mode capture-jsonb-baseline --query-set <tmp-query-set.json> --target-db-ref <approved-local-ref> --run-id <run-id>`
  - `pnpm literature:pgvector:phase2 -- --mode run-shadow --sample-workset dev-docs/active/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase2-readiness/sample-workset-manifest.json --query-set <tmp-query-set.json> --baseline <baseline.json> --run-id <run-id>`
