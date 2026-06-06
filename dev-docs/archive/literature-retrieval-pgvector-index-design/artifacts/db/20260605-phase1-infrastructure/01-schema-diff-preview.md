# 01 Schema Diff Preview

## Prisma SSOT Changes
- `LiteratureEmbeddingChunk` now declares nullable native retrieval storage:
  - `retrievalVector Unsupported("vector(3072)")?`
- Added migration bookkeeping model:
  - `LiteratureEmbeddingVectorBackfillRun`
- Added migration quarantine model:
  - `LiteratureEmbeddingVectorQuarantineIssue`

## Migration SQL
- Path:
  - `prisma/migrations/20260605104000_add_literature_pgvector_phase1/migration.sql`
- Adds:
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - nullable `"retrievalVector" vector(3072)` on `"LiteratureEmbeddingChunk"`.
  - `"LiteratureEmbeddingVectorBackfillRun"` table.
  - `"LiteratureEmbeddingVectorQuarantineIssue"` table.
  - backfill/quarantine lookup indexes.
- Does not:
  - drop JSONB `"vector"`.
  - mutate existing chunk rows.
  - create a native vector acceleration index.
  - switch retrieval reads.

## Context Sync
- Command:
  - `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
- Result:
  - `docs/context/db/schema.json` regenerated.
  - DB context checksum updated.

## Review Boundary
- The schema change is additive and migration-preparation only.
- Applying it to a persistent DB remains a separate approval step.
