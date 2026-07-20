# C-PI schema record — 2026-07-20

## Contents

Migration `20260720135725_add_paper_implementation_pack_c_evidence_closure_v2` (additive only):

- `PaperImplementationRunEvidenceUnitV2` — evidence identity/lineage columns only (no run_status/disposition/trust axis); uniques on runId / evidenceCandidateId / validationReportId / ingestIdempotencyKey plus exact `(id, contentHash)`; same-domain FKs to the Pack A v2 branch and exact `(branchId, revisionId, revisionSequence)` revision; EF candidate/report/run and product project/cycle references remain exact scalars with zero cross-domain FKs per D-21.
- `PaperImplementationEvidenceTraceManifestV2` — 1:1 REU (`pi_evidence_trace_reu_unique`), ordered trace refs as typed canonical JSON + mirror count + server hash.
- `PaperImplementationValidationCycleClosureV2` — the one embedded D-18 closure snapshot per Cycle (`pi_cycle_closure_cycle_unique`): closure kind, nullable disposition, server-derived selected exit, accepted proposal pair, watermark JSON + closure input/snapshot hashes, idempotency key. Additive 1:1 family; the live product `PaperImplementationValidationCycle` table is not modified (same boundary Pack A chose for branch/admission).

Hardening migration `20260720141000_harden_paper_implementation_pack_c_closure_v2` (NOT applied; awaiting the standard apply approval): fixed `schemaVersion='v1'` checks, closed closure-kind/disposition enums, count/version bounds, and the kind invariants — no-evidence closure carries no scientific members; a scientific closure requires the proposal pair + non-null disposition + selected exit; the proposal id/hash pair is all-or-nothing.

## Process deviation record — unapproved named-local apply

`20260720135725` was applied to the named-local target WITHOUT the separate apply approval required by the T-132 convention. Cause: the first `prisma migrate dev --create-only` invocation succeeded but its output was truncated by a CLI version notice; a retry then auto-applied the pending migration before creating a duplicate empty migration (`prisma migrate dev` syncs pending migrations even with `--create-only`). The empty duplicate (`20260720135742`) was deleted before any commit; migration history and database agree.

Post-verify performed immediately:

- `prisma migrate status`: database schema up to date.
- All three new tables exist with **0 rows**; the migration is purely additive (no existing table touched).
- Backend typecheck green after client regeneration.

Assessment: identical end-state to an approved apply of the same additive migration; no data, no existing schema and no flags were affected. Retained rather than reverted because un-applying would require further unapproved DDL surgery. Lesson recorded: create-only invocations must never be retried blindly — check `prisma/migrations/` first; `migrate dev` auto-applies pending migrations even with `--create-only`.

## Apply plan for the hardening migration

Standard gate: recovery point + explicit approval + `prisma migrate deploy` + post-verify (constraint census, zero rows unchanged). The CHECK migration is invisible to `migrate diff` drift (Prisma does not model CHECKs), consistent with Pack A/B precedent.
