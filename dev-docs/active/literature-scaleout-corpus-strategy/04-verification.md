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
- Checkpoint: D65 RAG singleton B11/B12 completion.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-before-d65-rag-singleton-promote-b12.json`
  - `20260608T-d65-rag-singleton-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-d65-rag-singleton-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d65-rag-singleton-b12-standard-initial-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d65-rag-singleton-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260608T-d65-rag-singleton-b12-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`
  - `20260608T-d65-rag-singleton-dossier-key-content-curated-apply.json`
  - `20260608T-d65-rag-singleton-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260608T-after-d65-rag-singleton-b12-index-state.json`
  - `20260608T-after-d65-rag-singleton-promote-b12-count.json`
- Result:
  - B11 dry-run classified the D65 singleton as high-band `READY_FOR_PROMOTION`.
  - B11 apply/promote created `LIT-0550`.
  - B12 acquisition planned 1 arXiv fulltext with 0 blockers, then succeeded and created 1 content asset.
  - B12 preprocessing, curated dossier import, chunking, embedding, and indexing completed for `LIT-0550`.
  - Final state probe confirmed all seven standard stages `SUCCEEDED`, active embedding version `eba36415-a43d-44cd-a48a-b33d62d83133`, and indexed vectors.
  - Final B13 count reports managed/effective corpus 364/364 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 17 |
| Candidate pool records | 609 |
| Candidate discovered records | 216 |
| Candidate ready-for-promotion records | 14 |
| Candidate promoted records | 221 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 15 |
| Candidate rejected records | 4 |
| Managed corpus records | 364 |
| Effective literature records | 364 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |

## Latest B10 Candidate Refill Checkpoint
- Checkpoint: D65 narrow RAG/test-time source-backed B10 refill.
- Status: completed candidate-layer write plus read-only B11 validation.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260608T-d65-rag-testtime-source-backed-refill-dry-run-b10-candidate-discovery-report.json`
  - `20260608T-d65-rag-testtime-arxiv-id-refill-dry-run-b10-candidate-discovery-report.json`
  - `20260608T-d65-testtime-exact-id-refill-dry-run-b10-candidate-discovery-report.json`
  - `20260608T-d65-rag-testtime-arxiv-id-refill-apply-b10-candidate-discovery-report.json`
  - `20260608T-d65-rag-testtime-b10-refill-b11-dry-run-b11-candidate-triage-report.json`
  - `20260608T-after-d65-rag-testtime-b10-refill-count.json`
- Result:
  - OpenAlex dry-run found 7 source-available RAG/test-time candidates: 2 `DISCOVERED` and 5 duplicates.
  - arXiv-ID dry-run found 4 source-backed candidates: 1 `DISCOVERED` and 3 duplicates.
  - B10 apply persisted only the clean `DISCOVERED` row for `Stronger Baselines for Retrieval-Augmented Generation with Long-Context Language Models`.
  - B11 dry-run classified the new candidate as high-band `READY_FOR_PROMOTION` with `db_delta=0`.
  - Candidate pool increased to 609; the candidate was later promoted and completed as `LIT-0550`.

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
- Status: completed after D65 B11/B12 completion documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-source-available-selector.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/key-content-curated-dossier-runner.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `LC_ALL=C rg -n "[^\x00-\x7F]" dev-docs/active/literature-scaleout-corpus-strategy/00-overview.md dev-docs/active/literature-scaleout-corpus-strategy/03-implementation-notes.md dev-docs/active/literature-scaleout-corpus-strategy/04-verification.md dev-docs/active/literature-scaleout-corpus-strategy/07-b10-candidate-discovery.md dev-docs/active/literature-scaleout-corpus-strategy/08-b11-candidate-triage-promote.md dev-docs/active/literature-scaleout-corpus-strategy/09-b12-standard-pipeline-pilot.md dev-docs/active/literature-scaleout-corpus-strategy/10-scaleout-run-ledger.md`
  - `git ls-files --others --exclude-standard dev-docs/active/literature-scaleout-corpus-strategy/artifacts`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts -maxdepth 1 -type f -name '20260608T-d65-rag-singleton*' -print`
  - `node .ai/tests/run.mjs --suite database`
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - B10 candidate discovery syntax check passed.
  - B11 triage/promote syntax check passed.
  - B11 source-available selector syntax check passed.
  - B12 standard pipeline syntax check passed.
  - B12 fulltext acquisition syntax check passed.
  - B12 content backfill syntax check passed.
  - curated dossier runner syntax check passed.
  - markdown diff whitespace check passed.
  - no non-ASCII drift was introduced in the updated D65 docs.
  - no D65 singleton generated artifact remains under versioned task artifact directories.
  - database suite passed.
  - governance sync completed.
  - governance lint passed with the existing unrelated T-115 warning.

## Governance Verification
- Latest D65 governance sync completed after D65 B11/B12 completion documentation update.
- Latest D65 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D65 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D64 selector/corpus-writing details and D65 refill/promotion/B12 details are captured above and summarized in `10-scaleout-run-ledger.md`.
