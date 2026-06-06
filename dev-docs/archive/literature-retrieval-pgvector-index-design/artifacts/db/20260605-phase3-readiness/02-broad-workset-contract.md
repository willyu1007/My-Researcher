# Phase 3 Broad Workset Contract

## File
- Default output: `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-workset-manifest.json`.
- Producer: `pnpm literature:pgvector:phase3 -- --mode plan`.

## Required Fields
- `schema_version`: `1`.
- `mode`: `phase3_workset`.
- `target_db_ref`: approved target fingerprint or unapproved planning placeholder.
- `migration_id`: `20260605104000_add_literature_pgvector_phase1`.
- `target_dimension`: expected native vector dimension.
- `target_column`: `retrievalVector`.
- `selected_literature_count`.
- `selected_embedding_version_count`.
- `selected_chunk_count`.
- `current_coverage`.
- `items`.
- `blockers`.
- `warnings`.

## Item Contract
- `literature_id`.
- `embedding_version_id`.
- `embedding_profile_id`.
- `provider`.
- `model`.
- `dimension`.
- `chunk_count`.
- `vector_count`.
- `stale_status`.
- `evidence_ready`.
- `native_vector_count`.
- `missing_native_vector_count`.

## Selection Rules
- Include only active embedding versions.
- Include only evidence-ready literature IDs.
- Include only versions matching the Phase 3 target dimension.
- Include only versions with positive chunk and vector counts.
- Record exclusions as warnings.
- Any empty selected workset is a blocker.

## Payload Safety
- The workset records identifiers and counts only.
- It must not include raw JSONB vectors or native pgvector payloads.
