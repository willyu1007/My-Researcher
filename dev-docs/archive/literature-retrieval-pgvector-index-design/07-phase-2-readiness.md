# 07 Phase 2 Readiness

## Conclusion
- Phase 2 target DB apply gate is approved and completed for `local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev`.
- Phase 2 sample workset, dry-run, JSONB baseline, sample execute backfill, `shadow_pgvector`, and final verify are completed on the approved local target.
- Phase 2 MUST run as small-scale migration and `shadow_pgvector` validation only.
- User-visible `/literature/retrieve` MUST remain on the JSONB retrieval path throughout Phase 2.
- This readiness package does not approve large-scale backfill, canary/default pgvector reads, or final cleanup.

## Finding Resolution

### F1 - Persistent Target DB Apply Is Not Approved
- Resolution: approved and completed for the local target recorded in `artifacts/db/20260605-phase2-readiness/target-db-apply-log.md`.
- The additive migration has disposable-DB evidence from Phase 1 and post-apply smoke evidence on the approved local target.
- Staging and production remain outside Phase 2 scope.

### F2 - Phase 2 Runbook And Evidence Shape Were Missing
- Resolution: add a fixed Phase 2 readiness package:
  - sample workset contract.
  - shadow query set contract.
  - shadow artifact schema.
  - verification checklist.
- Phase 2 execution MUST materialize the templates before any backfill writes.

### F3 - Shadow Runner Boundary Was Not Defined
- Resolution: define `shadow_pgvector` as an internal runner/artifact-sink boundary.
- Public `LiteratureRetrieveResponse` MUST NOT gain shadow telemetry fields in Phase 2.
- Shadow evidence is written to artifacts, not returned from the API.

### F4 - Stale Filtering And Candidate Cap Ordering Was Ambiguous
- Resolution: repository candidate input now uses `eligibleEmbeddingVersionIds`.
- The caller MUST resolve active, evidence-ready, and stale-policy eligibility before the pgvector candidate query.
- Per-literature candidate caps are applied only after stale-ineligible versions have been excluded from the input version set.

### F5 - Backfill Runner Contract Was Missing
- Resolution: define a Phase 2 backfill runner contract covering dry-run, execution, quarantine, resume, coverage, and rollback evidence.
- The low-level repository write remains a primitive; the Phase 2 runner owns validation, normalization, coverage, and artifact production.

## Phase 2 Entry Checklist
- [x] Phase 1 implementation and docs are accepted.
- [x] Target persistent local/dev DB is explicitly approved for additive migration apply.
- [x] Approved target DB has the Phase 1 migration applied and post-apply smoke evidence recorded.
- [x] Sample workset manifest is generated from the current DB before mutation.
- [x] JSONB baseline is captured for the fixed shadow query set before pgvector backfill.
- [x] Phase 2 runner writes only normalized `retrievalVector` values for the approved sample set.
- [x] `shadow_pgvector` evidence is artifact-only and not part of public API responses.
- [x] Execute and verify commands require an approved target DB ref that matches both the sample workset and the redacted `DATABASE_URL` fingerprint.

## Phase 2 Exit Evidence
- [x] Backfill dry-run summary exists for the sample workset.
- [x] Backfill execute summary exists for the same sample workset.
- [x] Native vector coverage is `100%` for the sample workset active/evidence-ready versions.
- [x] Unresolved quarantine rows are `0` for the sample workset active/evidence-ready versions.
- [x] Wrong-dimension, NaN, Infinity, and zero-norm counts are `0` for affected sample rows.
- [x] Score drift P95 is `<= 1e-4` and max drift is `<= 1e-3`.
- [x] Scoped topK overlap is `>= 0.9`; sample bounded-corpus topK overlap is `>= 0.8`.
- [x] `candidate_limit_hit` is recorded for every query and is not above `20%` across repeated shadow queries.
- [x] `LIT-0252` remains retrievable as a partial visual surface when scoped.
- [x] Stale-default-excluded query ran with no stale active/evidence-ready sample available; stale-include diagnostic is N/A for this local target.
- [x] User-visible retrieval remains JSONB after Phase 2.
- [x] Final verify checks artifact lineage plus live backfill-run completion, native vector coverage, unresolved quarantine, and public rollout mode.

## Evidence Root
- Phase 2 readiness artifacts: `artifacts/db/20260605-phase2-readiness/`.
- Phase 2 execution artifacts MUST be created under this root with a stable run id.
- Approved target DB apply log: `artifacts/db/20260605-phase2-readiness/target-db-apply-log.md`.
- Phase 2 execution log: `artifacts/db/20260605-phase2-readiness/phase2-execution-log.md`.
- Sample workset manifest: `artifacts/db/20260605-phase2-readiness/sample-workset-manifest.json`.
- Backfill dry-run artifact: `artifacts/db/20260605-phase2-readiness/backfill-sample-phase2-target-local-20260605-dryrun.json`.
- Fixed shadow query set: generated under `.ai/.tmp`; durable checksum/summary index is `artifacts/db/20260605-phase2-readiness/09-generated-artifact-index.md`.
- JSONB baseline: `artifacts/db/20260605-phase2-readiness/jsonb-baseline-phase2-target-local-20260605-baseline-v2.json`.
- Backfill execute artifact: `artifacts/db/20260605-phase2-readiness/backfill-sample-phase2-target-local-20260605-execute.json`.
- Shadow parity artifact: `artifacts/db/20260605-phase2-readiness/shadow-parity-phase2-target-local-20260605-shadow-v2.json`.
- Final verification: `artifacts/db/20260605-phase2-readiness/phase2-verification-phase2-target-local-20260605-verify.md`.

## Runner Entrypoint
- Package command:
  - `pnpm literature:pgvector:phase2 -- --mode plan --target-db-ref <local-dev-ref>`
  - `pnpm literature:pgvector:phase2 -- --mode capture-jsonb-baseline --query-set <json>`
  - `pnpm literature:pgvector:phase2 -- --mode backfill-sample --sample-workset <json>`
  - `pnpm literature:pgvector:phase2 -- --mode backfill-sample --sample-workset <json> --execute --target-db-approved --target-db-ref <local-dev-ref>`
  - `pnpm literature:pgvector:phase2 -- --mode run-shadow --sample-workset <json> --query-set <json> --baseline <json>`
  - `pnpm literature:pgvector:phase2 -- --mode verify --sample-workset <json> --backfill <json> --shadow <json> --target-db-approved --target-db-ref <local-dev-ref>`
- The execute command assumes the additive migration has already been approved, applied, and post-smoked.
