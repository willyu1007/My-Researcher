# Pack C schema diff preview — 2026-07-18

## Scope

Additive migration `20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2`, generated via `prisma migrate dev --create-only` against the named-local target (`127.0.0.1:5432/postgres?schema=my_researcher_dev`, migration history up to date at generation time) and then hand-reduced to the Pack C-only statement set. NOT applied to any database.

## Contents (additive only)

- Three new EF-owned tables: `ExperimentFoundationExperimentResultV2`, `ExperimentFoundationScientificValidationReportV2`, `ExperimentFoundationEvidenceCandidateV2`.
- Eleven unique/secondary indexes (`ef_experiment_result_*`, `ef_scientific_validation_*`, `ef_evidence_candidate_*`).
- Eight same-domain exact-scope FKs, all `ON DELETE RESTRICT ON UPDATE RESTRICT`:
  - result → Run `(runId, runManifestHash)`, RunCell `(runId, runCellId, trainingTaskSpecId, cellKey)`, TrainingTaskSpec `(id, taskSpecHash)`, ExecutionAttempt `(id)`;
  - report → Run exact-manifest, EvaluationProtocolRevision exact `(evaluationProtocolId, id, contentHash)`;
  - candidate → report exact `(id, validationHash)`, Run exact-manifest.
- Ten CHECK fences: fixed `schemaVersion='v1'`, `provenance='real_provider'`, `status IN ('passed','failed','unsupported')`, `validatorProfileVersion='scientific_validator_profile@v1'`, non-negative/positive snapshot mirror counts.
- Zero cross-domain FKs, zero modifications to existing tables, zero destructive operations.

## Structural invariants encoded

- One complete result per RunCell (`ef_experiment_result_run_cell_unique`) and per ExecutionAttempt; a conflicting second write fails closed (`VALIDATION_RESULT_CONFLICT` at the service layer, unique violation at the DB layer).
- One validation report per Run (`ef_scientific_validation_run_unique`) plus idempotency-key uniqueness for the sole-writer transaction.
- One EvidenceCandidate per report and per Run; candidate binds the exact `(reportId, validationHash)` pair so a tampered/hash-drifted report cannot anchor a candidate.
- Frozen scientific values live in named typed canonical-JSON snapshots (`resultSnapshotJson`, `reportSnapshotJson`) with server hashes and relational mirror counts, per D-22.

## Excluded pre-existing drift (NOT part of Pack C)

`prisma migrate dev --create-only` also emitted a large unrelated drift set: one `TopicResearchRecord` column-default drop plus two new indexes, and ~170 `RenameIndex` statements across topic-selection/literature/EF-legacy tables (migration history recorded truncated auto-generated index names that no longer match schema-implied names). This drift predates Pack C, belongs to other domains, and was removed from this migration. It is tracked as a separate reconciliation task; Pack C's named-local apply will use `prisma migrate deploy`, which applies this file verbatim and does not re-diff.

> Resolved 2026-07-19: full attribution and reconciliation landed as migration `20260719120000_reconcile_index_names_and_topic_research_record` (applied together with this Pack C migration via `migrate deploy`; drift now zero). See `../migrate-drift-reconciliation-20260719/01-analysis.md`.
