# Phase 2 Execution Log

## Target
- Target DB reference: `local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev`.
- Migration id: `20260605104000_add_literature_pgvector_phase1`.
- Public retrieval mode: `jsonb_only`.
- Scope: local target only; staging and production are out of scope.

## Completed Steps
- Target DB apply approved and recorded in `target-db-apply-log.md`.
- Additive migration applied successfully with Prisma versioned migration deploy.
- Post-apply smoke passed:
  - `vector` extension exists.
  - `LiteratureEmbeddingChunk.retrievalVector` exists as `vector(3072)`.
  - `LiteratureEmbeddingVectorBackfillRun` exists.
  - `LiteratureEmbeddingVectorQuarantineIssue` exists.
  - legacy `LiteratureEmbeddingChunk.vector` remains `jsonb`.
  - public retrieval mode remains `jsonb_only`.
- Sample workset manifest generated:
  - file: `sample-workset-manifest.json`.
  - sample count: `4`.
  - samples: `LIT-0252`, `LIT-0177`, `LIT-0178`, `LIT-0179`.
  - blockers: none.
  - warning: no stale active/evidence-ready diagnostic sample was found.
- Backfill dry-run completed:
  - file: `backfill-sample-phase2-target-local-20260605-dryrun.json`.
  - selected chunks: `390`.
  - raw vector count: `390`.
  - valid normalized vector count: `390`.
  - projected write count: `390`.
  - written native vector count: `0`.
  - quarantine count: `0`.
  - coverage ratio: `1`.
  - blockers: none.
- Fixed shadow query set generated:
  - file: `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase2-readiness/shadow-query-set-phase2-target-local-20260605-v2.json`.
  - durable index: `09-generated-artifact-index.md`.
  - query count: `5`.
  - query vectors: `3072` dimensions, normalized to unit length.
  - provider raw response: omitted.
- JSONB baseline captured:
  - file: `jsonb-baseline-phase2-target-local-20260605-baseline-v2.json`.
  - result: `5/5` queries passed.
  - source: internal scoped JSONB baseline over the sample workset.
- Backfill execute completed:
  - file: `backfill-sample-phase2-target-local-20260605-execute.json`.
  - selected chunks: `390`.
  - written native vectors: `390`.
  - coverage ratio: `1`.
  - quarantine count: `0`.
- Shadow parity completed:
  - file: `shadow-parity-phase2-target-local-20260605-shadow-v2.json`.
  - score drift P95: `6.837158202932514e-7`.
  - score drift max: `6.837158202932514e-7`.
  - scoped topK overlap min: `1`.
  - sample bounded-corpus topK overlap min: `1`.
  - candidate limit hit rate: `0`.
- Final verify completed:
  - file: `phase2-verification-phase2-target-local-20260605-verify.md`.
  - status: `PASS`.
  - blockers: none.
- Phase 2 quality hardening completed:
  - JSONB baseline artifacts now include query-set checksum and per-query fingerprints.
  - Shadow artifacts now include query-set and baseline lineage fields.
  - Final verify now requires target approval, sample workset input, redacted `DATABASE_URL` target matching, completed execute backfill evidence, and live DB checks.
- Final verify live gates passed:
  - approved target DB ref: `local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev`.
  - live backfill run status: `completed`.
  - live sample native vector coverage: `390/390`.
  - live unresolved quarantine: `0`.
  - live public retrieval mode: `jsonb_only`.

## Runner Repair During Execution
- Initial `plan` failed after target schema apply because the runner tried to read all active 3072-dimensional JSONB vectors during sample planning.
- Fix:
  - sample planning now uses `LiteratureEmbeddingVersion.chunkCount` and `vectorCount` metadata instead of loading all chunk vectors.
  - Prisma chunk reads explicitly select required legacy fields and exclude the `Unsupported("vector(3072)")` `retrievalVector` field.
- Evidence:
  - targeted runner/repository/settings tests passed, `11/11`.
  - backend typecheck passed.
  - `plan` rerun completed successfully.

## Baseline Scope Repair During Execution
- Finding:
  - Query-set `literature_scope` is an internal Phase 2 sample validation field; public `LiteratureRetrieveRequest` does not accept arbitrary `literature_ids`.
  - A scoped JSONB baseline cannot be produced by adding non-contract fields to the public request.
- Fix:
  - `captureJsonbBaseline` now uses an internal scoped JSONB baseline path when `literature_scope` is present.
  - The internal path compares the same sample corpus as pgvector shadow while leaving public retrieval responses unchanged.
- Evidence:
  - Added a unit test proving JSONB baseline preserves `literature_scope`.
  - Targeted runner/repository/settings tests passed, `11/11`.
  - backend typecheck passed.

## Candidate Window Adjustment
- First shadow run:
  - file: `shadow-parity-phase2-target-local-20260605-shadow.json`.
  - result: topK overlap passed, but `q_unscoped_bounded` produced score drift max `0.002911588937759446`.
  - diagnosis: the per-literature candidate cap was too narrow for the sample bounded-corpus query.
- Adjustment:
  - generated `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase2-readiness/shadow-query-set-phase2-target-local-20260605-v2.json`.
  - raised `q_unscoped_bounded.evidence_per_literature` from `3` to `5`, increasing per-literature candidate cap from `6` to `10`.
- Result:
  - v2 shadow score drift max improved to `6.837158202932514e-7`.
  - final verify passed.

## Remaining Boundaries
- User-visible retrieval remains `jsonb_only`.
- Stale-include diagnostic is N/A for this target because no stale active/evidence-ready sample was available.
- Phase 2 sample-corpus parity does not approve large-scale backfill, canary/default pgvector reads, staging/prod migration, or cleanup.
