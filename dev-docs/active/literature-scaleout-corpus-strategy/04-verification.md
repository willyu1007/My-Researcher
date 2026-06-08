# 04 Verification

## Verification Policy
- B10/B11/B12 DB-writing runs require:
  - pre-run B13 counting when the run changes corpus state.
  - dry-run artifact before any apply.
  - post-run B13 counting after apply.
  - generated artifacts stored under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Documentation-only cleanup requires:
  - markdown diff whitespace check.
  - governance sync.
  - governance lint.
- Database schema changes require the repo-prisma DB SSOT workflow and a separate scoped migration checkpoint.

## Latest Verified Corpus Checkpoint
- Checkpoint: D55 source-backed exact-title tranche.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-d55-openalex-exact-title-v3-dry-run-b10-candidate-discovery-report.json`
  - `20260608T-d55-openalex-exact-title-apply-b10-candidate-discovery-report.json`
  - `20260608T-d55-source-backed-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d55-source-backed-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d55-source-backed-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d55-source-backed-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d55-source-backed-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d55-source-backed-dossier-dossier-import.json`
  - `20260608T-d55-source-backed-index-apply-b12-content-backfill-pilot-report.json`
  - `20260608T-after-d55-source-backed-index-state.json`
  - `20260608T-after-d55-source-backed.json`
- Result:
  - B10 apply persisted 1 batch and 11 `DISCOVERED` candidates.
  - B11 dry-run classified all 11 as high-band `READY_FOR_PROMOTION`.
  - B11 apply/promote created `LIT-0490` through `LIT-0500`.
  - B12 acquisition, preprocessing, curated dossier import, chunking, embedding, and indexing completed for all 11.
  - Final state probe confirmed all 11 records have all seven standard stages `SUCCEEDED`.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 14 |
| Candidate pool records | 588 |
| Candidate discovered records | 233 |
| Candidate ready-for-promotion records | 23 |
| Candidate promoted records | 171 |
| Candidate duplicate records | 146 |
| Candidate deferred records | 11 |
| Candidate rejected records | 4 |
| Managed corpus records | 314 |
| Effective literature records | 314 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |

## Latest Tool Verification
- Status: completed before D55 documentation commit.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node .ai/tests/run.mjs --suite database`
- Result:
  - syntax checks passed.
  - database suite passed.

## Governance Verification
- Latest D55 governance sync completed before D55 documentation commit.
- Latest D55 governance lint passed with the existing unrelated T-115 warning:
  - `T-115 topic-selection-v1b-human-review-path` is `done` while its historical overview acceptance checklist remains unchecked.
- Treat the T-115 warning as out of scope for T-122 literature work unless the user asks to clean that task package.

## D56 Documentation Hygiene Verification
- Status: completed with the existing unrelated T-115 warning.
- Scope:
  - compact append-only completed-run docs.
  - add `10-scaleout-run-ledger.md`.
  - no DB writes.
  - no literature pipeline writes.
- Commands:
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - markdown diff whitespace check passed.
  - governance sync completed.
  - governance lint passed after removing the accidental `State: in-progress.` punctuation.
  - remaining warning is the existing unrelated T-115 acceptance-checkbox warning.

## Historical Verification Index
- D1-D55 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
