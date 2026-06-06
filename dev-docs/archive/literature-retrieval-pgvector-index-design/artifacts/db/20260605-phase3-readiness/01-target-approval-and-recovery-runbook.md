# Phase 3 Target Approval And Recovery Runbook

## Approval Gate
- Required for execute and verify:
  - `--target-db-approved`
  - `--target-db-ref local-env:<host>:<port>/<database>?schema=<schema>`
- The CLI computes the same redacted fingerprint from `DATABASE_URL` and rejects mismatches.
- The workset manifest `target_db_ref` must match the approved target ref.

## Allowed Scope
- Active, evidence-ready literature embedding versions selected by the Phase 3 workset.
- Target dimension must match the runner target dimension.
- The target column is `retrievalVector`.
- Public retrieval mode must remain `jsonb_only`.

## Not Allowed Without Separate Approval
- Staging DB mutation.
- Production DB mutation.
- Public `shadow_pgvector`, `pgvector_canary`, or `pgvector_default` promotion.
- JSONB vector cleanup.

## Recovery Behavior
- Backfill execute creates or resumes a `LiteratureEmbeddingVectorBackfillRun` row by `run_id`.
- Each completed batch records a recovery checkpoint:
  - batch index.
  - completed-through chunk offset.
  - cumulative written native-vector count.
- Re-running the same workset is idempotent at the native-vector write level because rows are updated by embedding chunk ID.
- Open blocking quarantine rows block Phase 3 verification and must be resolved or excluded by a new approved workset before promotion.
- If a batch fails, the run is marked failed with `BATCH_WRITE_FAILED`; rerun with the same `run_id` after fixing the cause or use a new reviewed `run_id`.

## Operator Commands
```bash
pnpm literature:pgvector:phase3 -- --mode plan --target-db-ref <approved-local-ref>
pnpm literature:pgvector:phase3 -- --mode backfill --workset <workset.json>
pnpm literature:pgvector:phase3 -- --mode backfill --workset <workset.json> --execute --target-db-approved --target-db-ref <approved-local-ref>
pnpm literature:pgvector:phase3 -- --mode verify --workset <workset.json> --backfill <backfill.json> --target-db-approved --target-db-ref <approved-local-ref>
```
