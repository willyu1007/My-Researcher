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
- Checkpoint: D83 D82 RAG clean2 promote/B12 completion.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d83-d82-rag-clean2-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d83-d82-rag-clean2-b12-initial-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-b12-fulltext-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-backfill-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-final-state-probe-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d83-after-d82-rag-clean2-completion-count.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d83-d82-rag-clean2-dossier-apply-key-content-curated-apply.json`
- Result:
  - D83 promoted and completed the 2 D82 RAG clean2 candidates as `LIT-0608` and `LIT-0609`.
  - both records completed through `INDEXED`.
  - Final B13 count reports managed/effective corpus 407/407 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 29 |
| Candidate pool records | 644 |
| Candidate discovered records | 0 |
| Candidate ready-for-promotion records | 81 |
| Candidate promoted records | 280 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 126 |
| Candidate rejected records | 18 |
| Managed corpus records | 407 |
| Effective literature records | 407 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 25 |

## Latest B10 Candidate Refill Checkpoint
- Checkpoint: D82 RAG/test-time wide source-backed scout plus clean2 RAG apply.
- Status: completed candidate-layer write and B11 dry-run validation; both D82 candidates were promoted and completed in D83.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d82-before-rag-testtime-scaleout.json`
  - `20260610T-d82-rag-testtime-wide-sourcebacked-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-testtime-arxiv-curated-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-testtime-exact-title-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-clean2-curated-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-clean2-curated-apply-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-clean2-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d82-after-rag-clean2-b10-refill.json`
  - `20260610T-d83-after-d82-rag-clean2-completion-count.json`
- Result:
  - wide RAG/test-time source-backed scout inspected 2400 provider results and found 56 source-backed candidates: 11 new rows and 45 duplicates.
  - manual curation rejected code-completion, domain, application, RL-training, and personalization tails.
  - D82 B10 apply persisted 2 clean RAG core `DISCOVERED` candidates and created no `LiteratureRecord` rows.
  - B11 dry-run classified both as high-band `READY_FOR_PROMOTION`.
  - Final D83 B13 count reports candidate pool 644, `DISCOVERED` 0, managed/effective 407/407, and 0 managed blockers.

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
- Status: completed after D83 D82 RAG clean2 promote/B12 completion and documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
  - `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/key-content-curated-dossier-runner.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `LC_ALL=C rg -n "[^\x00-\x7F]" dev-docs/active/literature-scaleout-corpus-strategy/00-overview.md dev-docs/active/literature-scaleout-corpus-strategy/03-implementation-notes.md dev-docs/active/literature-scaleout-corpus-strategy/04-verification.md dev-docs/active/literature-scaleout-corpus-strategy/07-b10-candidate-discovery.md dev-docs/active/literature-scaleout-corpus-strategy/08-b11-candidate-triage-promote.md dev-docs/active/literature-scaleout-corpus-strategy/09-b12-standard-pipeline-pilot.md dev-docs/active/literature-scaleout-corpus-strategy/10-scaleout-run-ledger.md`
  - `SCALEOUT_COUNTING_RUN_ID=20260610T-d83-after-d82-rag-clean2-completion-count TS_NODE_PROJECT=apps/backend/tsconfig.json TS_NODE_TRANSPILE_ONLY=1 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
  - `git ls-files --others --exclude-standard dev-docs/active/literature-scaleout-corpus-strategy/artifacts`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts -maxdepth 1 -type f -name '20260610T-d83*.json' -print`
  - `node .ai/tests/run.mjs --suite database`
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result:
  - B10 candidate discovery syntax check passed.
  - B11 triage/promote syntax check passed.
  - B12 standard pipeline syntax check passed.
  - B12 fulltext acquisition syntax check passed.
  - B12 content backfill syntax check passed.
  - B13 counting report syntax check passed.
  - curated dossier runner syntax check passed.
  - markdown diff whitespace check passed.
  - no non-ASCII drift was introduced in the updated D83 docs.
  - fresh D83 live counting report matched the final B13 metrics.
  - no D83 generated artifact remains under versioned task artifact directories.
  - database suite passed.
  - governance sync completed.
  - governance lint passed with the existing unrelated T-115 warning.

## Governance Verification
- Latest D83 governance sync completed after D83 documentation update.
- Latest D83 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D83 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D83 completion details, D82 candidate-layer details, D81 completion details, D80 candidate-layer details, D79 completion details, D78 candidate-layer details, D77 completion details, D76 candidate-layer details, D75 corpus details, and D65-D74 refill/promotion/B12 details are captured above and summarized in `10-scaleout-run-ledger.md`.
