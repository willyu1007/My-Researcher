# Phase 3 Backfill And Verification Contract

## Backfill Artifact
- Producer: `pnpm literature:pgvector:phase3 -- --mode backfill`.
- Default generated JSON output is under `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/`.
- Modes:
  - `dry_run`: validates and projects writes without mutation.
  - `execute`: requires approved target and writes native vectors.

## Backfill Required Evidence
- `target_db_ref`, `migration_id`, `target_dimension`, and `target_column`.
- `workset_ref`.
- `batch_size`.
- `throughput`:
  - `started_at`.
  - `completed_at`.
  - `elapsed_ms`.
  - `valid_vectors_per_second`.
- `totals`:
  - selected literature/version/chunk counts.
  - raw vector count.
  - valid normalized vector count.
  - projected write count.
  - written native-vector count.
  - coverage before and after.
  - quarantine counts.
  - invalid vector counts.
  - retry count.
  - batch count.
  - completed batch count.
- `batches`:
  - batch index.
  - chunk offset range.
  - projected write count.
  - written count.
  - attempt count.
  - status.
  - error message.
- `recovery_checkpoints`.
- `quarantine_issues`.
- `blockers`.

## Verification Artifact
- Producer: `pnpm literature:pgvector:phase3 -- --mode verify`.
- Requires approved target and a backfill artifact.
- Uses live repository coverage, not sample candidate smoke.

## Verification Gates
- Approved target DB ref.
- Artifact target lineage.
- Artifact migration lineage.
- Execute backfill completed and live run row completed.
- Full selected-corpus native-vector coverage.
- Zero open blocking quarantine rows.
- Public retrieval mode remains `jsonb_only`.

## Payload Safety
- Quarantine issues redact vector payloads.
- Coverage records counts by literature/version only.
- Artifacts must not store raw embedding vectors.
