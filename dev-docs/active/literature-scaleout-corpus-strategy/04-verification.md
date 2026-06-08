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
- Checkpoint: D58 RAG/test-time duplicate-loop rebalance tranche.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-d58-rag-testtime-source-backed-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260608T-d58-rag-testtime-duplicate-loop-v2-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d58-rag-testtime-duplicate-loop-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d58-rag-testtime-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d58-rag-testtime-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d58-rag-testtime-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d58-rag-testtime-dossier-dossier-import.json`
  - `20260608T-d58-rag-testtime-index-apply-b12-content-backfill-pilot-report.json`
  - `20260608T-after-d58-rag-testtime-index-state.json`
  - `20260608T-d58-reasoning-token-economies-duplicate-cleanup-apply-b11-candidate-triage-report.json`
  - `20260608T-after-d58-rag-testtime-cleanup.json`
- Result:
  - B10 scouting was read-only and wrote no candidate rows.
  - B11 duplicate-loop dry-run produced 4 high-band `READY_FOR_PROMOTION` decisions and 5 duplicate companion decisions.
  - B11 apply/promote created `LIT-0513` through `LIT-0516`.
  - B12 acquisition, preprocessing, curated dossier import, chunking, embedding, and indexing completed for all 4.
  - Final state probe confirmed all 4 records have all seven standard stages `SUCCEEDED`.
  - Cleanup marked the leftover DOI candidate for `Reasoning in Token Economies` as duplicate after the arXiv-backed canonical row was promoted.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 15 |
| Candidate pool records | 600 |
| Candidate discovered records | 232 |
| Candidate ready-for-promotion records | 23 |
| Candidate promoted records | 187 |
| Candidate duplicate records | 143 |
| Candidate deferred records | 11 |
| Candidate rejected records | 4 |
| Managed corpus records | 330 |
| Effective literature records | 330 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |

## Latest Tool Verification
- Status: completed after D58 documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node --check .ai/.tmp/literature-scaleout-corpus-strategy/d54-import-keycontent-dossier.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `LC_ALL=C rg -n "[^\x00-\x7F]" dev-docs/active/literature-scaleout-corpus-strategy/00-overview.md dev-docs/active/literature-scaleout-corpus-strategy/03-implementation-notes.md dev-docs/active/literature-scaleout-corpus-strategy/04-verification.md dev-docs/active/literature-scaleout-corpus-strategy/07-b10-candidate-discovery.md dev-docs/active/literature-scaleout-corpus-strategy/08-b11-candidate-triage-promote.md dev-docs/active/literature-scaleout-corpus-strategy/09-b12-standard-pipeline-pilot.md dev-docs/active/literature-scaleout-corpus-strategy/10-scaleout-run-ledger.md`
  - `git ls-files --others --exclude-standard dev-docs/active/literature-scaleout-corpus-strategy/artifacts`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts -maxdepth 1 -type f -name '*d58*' -print`
  - `node .ai/tests/run.mjs --suite database`
- Result:
  - syntax checks passed.
  - markdown diff whitespace check passed.
  - no non-ASCII drift was introduced in the updated D58 docs.
  - no D58 generated artifact remains under versioned `dev-docs/active/literature-scaleout-corpus-strategy/artifacts`.
  - database suite passed.

## Governance Verification
- Latest D58 governance sync completed after D58 documentation update.
- Latest D58 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D58 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D58 verification details are captured in the latest checkpoint above and summarized in `10-scaleout-run-ledger.md`.
