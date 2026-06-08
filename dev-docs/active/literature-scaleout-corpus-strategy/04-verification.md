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
- Checkpoint: D60 RAG/test-time direction-balance B11/B12 tranche.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-before-d60-direction-balance.json`
  - `20260608T-d60-direction-balance-arxiv-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d60-direction-balance-doi-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d60-direction-balance-clean6-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d60-direction-balance-clean6-b12-standard-initial-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d60-direction-balance-clean6-b12-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d60-direction-balance-clean6-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d60-direction-balance-lit0525-arxiv-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d60-direction-balance-lit0525-arxiv-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d60-direction-balance-clean6-b12-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d60-direction-balance-clean6-dossier-dossier-dry-run.json`
  - `20260608T-d60-direction-balance-clean6-dossier-dossier-import.json`
  - `20260608T-d60-direction-balance-clean6-b12-index-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d60-direction-balance-final-count.json`
- Result:
  - Initial arXiv-backed RAG/test-time B11 dry-run remained read-only and exposed mutually linked duplicate-loop candidates.
  - DOI/ACL dry-run produced 6 clean high-band `READY_FOR_PROMOTION` decisions and 3 duplicate-loop companion decisions.
  - B11 apply/promote created `LIT-0521` through `LIT-0526` from the 6 clean candidates only.
  - B12 acquisition initially created 5 assets through Unpaywall-discovered ACL PDFs; `LIT-0525` was recovered through explicit arXiv acquisition after `UNPAYWALL_NO_OA_PDF`.
  - Fulltext preprocessing, curated dossier import, chunking, embedding, and indexing completed for all 6 promoted records.
  - Final state probe confirmed all 6 records have all seven standard stages `SUCCEEDED`.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 16 |
| Candidate pool records | 608 |
| Candidate discovered records | 226 |
| Candidate ready-for-promotion records | 23 |
| Candidate promoted records | 197 |
| Candidate duplicate records | 143 |
| Candidate deferred records | 15 |
| Candidate rejected records | 4 |
| Managed corpus records | 340 |
| Effective literature records | 340 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |

## Latest Tool Verification
- Status: completed after D60 documentation update.
- Commands:
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `LC_ALL=C rg -n "[^\x00-\x7F]" dev-docs/active/literature-scaleout-corpus-strategy/00-overview.md dev-docs/active/literature-scaleout-corpus-strategy/03-implementation-notes.md dev-docs/active/literature-scaleout-corpus-strategy/04-verification.md dev-docs/active/literature-scaleout-corpus-strategy/07-b10-candidate-discovery.md dev-docs/active/literature-scaleout-corpus-strategy/08-b11-candidate-triage-promote.md dev-docs/active/literature-scaleout-corpus-strategy/09-b12-standard-pipeline-pilot.md dev-docs/active/literature-scaleout-corpus-strategy/10-scaleout-run-ledger.md`
  - `git ls-files --others --exclude-standard dev-docs/active/literature-scaleout-corpus-strategy/artifacts`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts -maxdepth 1 -type f -name '20260608T-d60-*' -print`
  - `node .ai/tests/run.mjs --suite database`
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - markdown diff whitespace check passed.
  - no non-ASCII drift was introduced in the updated D60 docs.
  - no D60 generated artifact remains under versioned `dev-docs/active/literature-scaleout-corpus-strategy/artifacts`.
  - database suite passed.
  - governance sync completed.
  - governance lint passed with the existing unrelated T-115 warning.

## Governance Verification
- Latest D60 governance sync completed after D60 documentation update.
- Latest D60 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D60 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D60 verification details are captured in the latest checkpoint above and summarized in `10-scaleout-run-ledger.md`.
