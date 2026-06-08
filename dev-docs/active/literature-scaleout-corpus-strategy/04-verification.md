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
- Checkpoint: D70 D69 RAG promote/B12 plus test-time direction-balance completion.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-before-d70-d69-rag-promote-b12.json`
  - `20260610T-d70-d69-rag-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d70-d69-rag-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d70-testtime-balance-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-apply-b10-candidate-discovery-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d70-testtime-sample-compute-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-after-d70-final-balanced.json`
- Result:
  - D70 promoted the 2 D69 RAG candidates as `LIT-0578` and `LIT-0579`; both completed through `INDEXED`.
  - Direction-balance selector surfaced `LIT-0580`, but TechRxiv/Cloudflare PDF access returned HTTP 403, so it was soft-excluded.
  - D70 exact-title test-time B10 refill staged `Scaling LLM Inference with Optimized Sample Compute Allocation`, promoted it as `LIT-0581`, and completed it through `INDEXED`.
  - Final B13 count reports managed/effective corpus 379/379 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 20 |
| Candidate pool records | 616 |
| Candidate discovered records | 0 |
| Candidate ready-for-promotion records | 81 |
| Candidate promoted records | 252 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 126 |
| Candidate rejected records | 18 |
| Managed corpus records | 379 |
| Effective literature records | 379 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 25 |

## Latest B10 Candidate Refill Checkpoint
- Checkpoint: D70 test-time exact-title source-backed B10 refill.
- Status: completed candidate-layer write, B11 promotion, and B12 completion.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d70-testtime-balance-sourcebacked-scout-b10-candidate-discovery-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-apply-b10-candidate-discovery-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d70-testtime-sample-compute-b12-index-apply-b12-content-backfill-pilot-report.json`
- Result:
  - broad test-time scout found no clean new non-tail candidate to apply.
  - exact-title dry-run selected `Scaling LLM Inference with Optimized Sample Compute Allocation`.
  - B10 apply persisted 1 `DISCOVERED` candidate; no `LiteratureRecord` rows were created by B10.
  - B11 classified it as high-band `READY_FOR_PROMOTION`, promoted it as `LIT-0581`, and B12 completed it through `INDEXED`.
  - Final B13 count reports candidate pool 616, `DISCOVERED` 0, managed/effective 379/379, and 0 managed blockers.

## Latest Read-Only Selector Checkpoint
- Checkpoint: D70 test-time balance selector dry-runs.
- Status: completed read-only.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d70-current-balance-b11-dry-run-b11-candidate-triage-report.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d70-testtime-balance-selector-dry-run-b11-source-available-selector.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d70-testtime-balance-selector-preprint-dry-run-b11-source-available-selector.json`
- Result:
  - current B11 dry-run over 208 candidates produced 82 `READY_FOR_PROMOTION`, 125 `DEFERRED`, and 1 `DUPLICATE` decision.
  - strict selector selected 0 test-time candidates under arXiv/ACL/DOI source gating.
  - adding `preprint_doi` surfaced a TechRxiv singleton, but B12 acquisition later failed with HTTP 403 and the promoted record was soft-excluded.

## Latest Tool Verification
- Status: completed after D70 promote/B12 and direction-balance update.
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
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts -maxdepth 1 -type f \( -name '20260610T-d70*' -o -name '20260610T-after-d70*' -o -name '20260610T-before-d70*' \) -print`
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
  - no non-ASCII drift was introduced in the updated D69 docs.
  - no D70 generated artifact remains under versioned task artifact directories.
  - database suite passed.
  - governance sync completed.
  - governance lint passed with the existing unrelated T-115 warning.

## Governance Verification
- Latest D70 governance sync completed after D70 documentation update.
- Latest D70 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D70 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D70 direction-balance details and D65-D69 refill/promotion/B12 details are captured above and summarized in `10-scaleout-run-ledger.md`.
