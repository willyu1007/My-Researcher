# Shadow Artifact Contract

## Files
Phase 2 execution MUST write:
- `sample-workset-manifest.json`.
- `shadow-query-set.json`.
- `jsonb-baseline-<run_id>.json`.
- `backfill-sample-<run_id>.json`.
- `shadow-parity-<run_id>.json`.
- `phase2-verification-<run_id>.md`.

## Shadow Parity Schema
`shadow-parity-<run_id>.json` MUST follow this shape:

```json
{
  "schema_version": 1,
  "run_id": "phase2-shadow-YYYYMMDD-HHMMSS",
  "mode": "shadow_pgvector",
  "target_db_ref": "redacted local/dev target reference",
  "migration_id": "20260605104000_add_literature_pgvector_phase1",
  "sample_workset_ref": "sample-workset-manifest.json",
  "query_set_ref": "shadow-query-set.json",
  "query_set_checksum": "sha256",
  "jsonb_baseline_ref": "jsonb-baseline-<run_id>.json",
  "jsonb_baseline_run_id": "phase2-jsonb-baseline-run-id",
  "jsonb_baseline_query_set_checksum": "sha256",
  "pgvector_shadow": {
    "candidate_limit_floor": 200,
    "scoped_candidate_limit_ceiling": 2000,
    "unscoped_candidate_limit_ceiling": 1200,
    "per_literature_candidate_cap_policy": "clamp(evidence_per_literature * 2, 4, 12)"
  },
  "metrics": {
    "native_vector_coverage_ratio": 1,
    "unresolved_quarantine_count": 0,
    "wrong_dimension_count": 0,
    "non_finite_count": 0,
    "zero_norm_count": 0,
    "score_drift_p95": 0,
    "score_drift_max": 0,
    "topk_overlap_scoped_min": 1,
    "topk_overlap_unscoped_min": 1,
    "candidate_limit_hit_rate": 0,
    "db_similarity_latency_ms_p95": 0
  },
  "query_results": [],
  "gate_results": [],
  "quarantine_summary": {
    "created": 0,
    "unresolved": 0,
    "issue_codes": []
  }
}
```

## Prohibited Content
- Do not store full raw JSONB vectors.
- Do not store full normalized corpus pgvector payloads.
- Do not store raw database credentials.
- Do not store public API shadow telemetry fields because there should be none.

## Gate Thresholds
- Approved target DB reference must match the sample workset, backfill artifact, shadow artifact, and redacted `DATABASE_URL` fingerprint.
- Shadow query-set checksum must match the JSONB baseline query-set checksum.
- Final verification must use a completed `execute` backfill artifact, not a dry-run artifact.
- Coverage for sample active/evidence-ready versions: `100%`.
- Unresolved quarantine affecting sample active/evidence-ready versions: `0`.
- Wrong-dimension, NaN, Infinity, and zero-norm counts: `0`.
- Score drift P95: `<= 1e-4`.
- Score drift max: `<= 1e-3`.
- Scoped topK overlap: `>= 0.9`.
- Unscoped topK overlap: `>= 0.8`.
- Repeated `candidate_limit_hit` rate above `20%` blocks promotion beyond shadow validation.
