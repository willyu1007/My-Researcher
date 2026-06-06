# Phase 2 Verification

- Run ID: `phase2-target-local-20260605-verify`
- Status: `PASS`

## Gates
- pass: approved_target_db_ref observed="local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev" threshold=must be approved and match sample workset target_db_ref
- pass: artifact_target_lineage observed="local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev | local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev | local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev" threshold=manifest/backfill/shadow target_db_ref must match
- pass: artifact_migration_lineage observed="20260605104000_add_literature_pgvector_phase1 | 20260605104000_add_literature_pgvector_phase1" threshold=both artifacts must reference 20260605104000_add_literature_pgvector_phase1
- pass: shadow_query_lineage observed="6f36f11dcfcc0be4b7e55ca49afcfe28e8c02e2266398927ff633c1bad480cb4 | 6f36f11dcfcc0be4b7e55ca49afcfe28e8c02e2266398927ff633c1bad480cb4" threshold=shadow query_set_checksum must match JSONB baseline query_set_checksum
- pass: backfill_execute_mode observed="execute/completed" threshold=backfill artifact must be completed execute output
- pass: written_native_vector_count observed=390 threshold=must equal selected_chunk_count
- pass: sample_native_vector_coverage observed=1 threshold=must equal 1
- pass: unresolved_quarantine observed=0 threshold=must equal 0
- pass: invalid_vector_counts observed="0/0/0" threshold=wrong_dimension/non_finite/zero_norm must all equal 0
- pass: score_drift_p95 observed=6.837158202932514e-7 threshold=<= 1e-4
- pass: score_drift_max observed=6.837158202932514e-7 threshold=<= 1e-3
- pass: topk_overlap_scoped_min observed=1 threshold=>= 0.9
- pass: topk_overlap_unscoped_min observed=1 threshold=>= 0.8
- pass: candidate_limit_hit_rate observed=0 threshold=<= 0.2
- pass: live_backfill_run_completed observed="completed" threshold=backfill run row must exist and be completed
- pass: live_sample_native_vector_coverage observed="390/390" threshold=live pgvector candidate smoke must return every selected sample chunk
- pass: live_unresolved_quarantine observed=0 threshold=open blocking quarantine rows for the backfill run must equal 0
- pass: live_public_retrieval_mode observed="jsonb_only" threshold=must remain jsonb_only during Phase 2

## Blockers
- none
