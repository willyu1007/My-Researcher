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
- Checkpoint: D64 wide source-available B11/B12 tranche.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-before-d64-wide-source-available.json`
  - `20260608T-d64-wide-source-available-pool.json`
  - `20260608T-d64-wide-source-available-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d64-wide-source-available-selector-dry-run-b11-source-available-selector.json`
  - `20260608T-d64-wide-source-available-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d64-wide-source-available-b12-standard-initial-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d64-wide-source-available-b12-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d64-wide-source-available-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d64-wide-source-available-b12-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d64-wide-source-available-dossier-dossier-dry-run.json`
  - `20260608T-d64-wide-source-available-dossier-dossier-import.json`
  - `20260608T-d64-wide-source-available-b12-index-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-after-d64-wide-source-available-index-state.json`
  - `20260608T-d64-wide-source-available-final-count.json`
- Result:
  - B11 dry-run over 230 current source-available candidates produced 32 `READY_FOR_PROMOTION` decisions with `db_delta=0`.
  - Selector selected 11 clean candidates after D63 test-time tail exclusions were enforced.
  - B11 apply/promote created `LIT-0539` through `LIT-0549`.
  - B12 acquisition planned 11 rights-safe fulltexts with 0 blockers, then succeeded for all 11 and created 11 content assets.
  - B12 preprocessing, curated dossier import, chunking, embedding, and indexing completed for all 11 promoted records.
  - Final state probe confirmed all 11 records have all seven standard stages `SUCCEEDED`, active embedding versions, and indexed vectors.
  - Final B13 count reports managed/effective corpus 363/363 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 16 |
| Candidate pool records | 608 |
| Candidate discovered records | 216 |
| Candidate ready-for-promotion records | 14 |
| Candidate promoted records | 220 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 15 |
| Candidate rejected records | 4 |
| Managed corpus records | 363 |
| Effective literature records | 363 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |

## Latest Read-Only Selector Checkpoint
- Checkpoint: D64 wide source-available selector dry-run.
- Status: completed read-only.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-d64-wide-source-available-pool.json`
  - `20260608T-d64-wide-source-available-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d64-wide-source-available-selector-dry-run-b11-source-available-selector.json`
- Result:
  - source-available pool contained 230 candidates across RAG, serving, and test-time directions.
  - B11 dry-run produced 32 `READY_FOR_PROMOTION` decisions with `db_delta=0`.
  - selector selected 11 candidates from 11 eligible decisions after application-tail filtering.
  - strict D63 tail exclusions removed remaining test-time application-tail candidates, so the selected set was serving-weighted.

## Latest Tool Verification
- Status: completed after D64 documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-source-available-selector.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `LC_ALL=C rg -n "[^\x00-\x7F]" dev-docs/active/literature-scaleout-corpus-strategy/00-overview.md dev-docs/active/literature-scaleout-corpus-strategy/03-implementation-notes.md dev-docs/active/literature-scaleout-corpus-strategy/04-verification.md dev-docs/active/literature-scaleout-corpus-strategy/07-b10-candidate-discovery.md dev-docs/active/literature-scaleout-corpus-strategy/08-b11-candidate-triage-promote.md dev-docs/active/literature-scaleout-corpus-strategy/09-b12-standard-pipeline-pilot.md dev-docs/active/literature-scaleout-corpus-strategy/10-scaleout-run-ledger.md`
  - `git ls-files --others --exclude-standard dev-docs/active/literature-scaleout-corpus-strategy/artifacts`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts -maxdepth 1 -type f -name '20260608T-d64-*' -print`
  - `node .ai/tests/run.mjs --suite database`
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - B11 triage/promote syntax check passed.
  - B11 source-available selector syntax check passed.
  - markdown diff whitespace check passed.
  - no non-ASCII drift was introduced in the updated D64 docs.
  - no D64 generated artifact remains under versioned `dev-docs/active/literature-scaleout-corpus-strategy/artifacts`.
  - database suite passed.
  - governance sync completed.
  - governance lint passed with the existing unrelated T-115 warning.

## Governance Verification
- Latest D64 governance sync completed after D64 documentation update.
- Latest D64 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D64 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D64 selector and corpus-writing details are captured above and summarized in `10-scaleout-run-ledger.md`.
