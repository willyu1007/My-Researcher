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
- Checkpoint: D91 D90 RAG-core promote/B12 completion.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d91-before-promote.json`
  - `20260610T-d91-d90-rag-core-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d91-d90-rag-core-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d91-d90-rag-core-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d91-d90-rag-core-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d91-d90-rag-core-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d91-d90-rag-core-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d91-d90-rag-core-key-content-apply-key-content-curated-apply.json`
  - `20260610T-d91-d90-rag-core-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d91-d90-rag-core-final-state-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d91-after-b12.json`
- Result:
  - D91 promoted and completed the 2 D90 source-backed high-band RAG-core candidates as `LIT-0623`-`LIT-0624`.
  - both records completed through `INDEXED`.
  - Final B13 count reports managed/effective corpus 422/422 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 32 |
| Candidate pool records | 669 |
| Candidate discovered records | 0 |
| Candidate ready-for-promotion records | 81 |
| Candidate promoted records | 295 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 134 |
| Candidate rejected records | 20 |
| Managed corpus records | 422 |
| Effective literature records | 422 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 25 |

## Latest B10 Candidate Refill Checkpoint
- Checkpoint: D90 adjacent-topic clean6 refill.
- Status: completed candidate-layer write and B11 status apply; no promotion was run in D90.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d90-adjacent-broad-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-apply-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d90-adjacent-clean6-b11-apply-b11-candidate-triage-report.json`
  - `20260610T-d90-after-b10-b11.json`
- Result:
  - D90 broad scout produced 32 dry-run candidates with no DB writes.
  - D90 clean6 B10 apply persisted 4 source-backed `DISCOVERED` candidates and created no `LiteratureRecord` rows.
  - D90 B11 apply marked 2 candidates `READY_FOR_PROMOTION` and 2 candidates `DEFERRED`; the ready subset was promoted and completed in D91.
  - Final D91 B13 count reports candidate pool 669, `DISCOVERED` 0, managed/effective 422/422, and 0 managed blockers.

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
- Status: completed after D91 D90 RAG-core promote/B12 completion and documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
  - `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/key-content-curated-dossier-runner.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts -maxdepth 1 -type f -name '20260610T-d91*.json' -print`
  - `SCALEOUT_COUNTING_RUN_ID=20260610T-d91-after-b12 TS_NODE_PROJECT=apps/backend/tsconfig.json TS_NODE_TRANSPILE_ONLY=1 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
- Result:
  - B10 candidate discovery syntax check passed.
  - B11 triage/promote syntax check passed.
  - B12 standard pipeline syntax check passed.
  - B12 fulltext acquisition syntax check passed.
  - B12 content backfill syntax check passed.
  - B13 counting report syntax check passed.
  - curated dossier runner syntax check passed.
  - markdown diff whitespace check passed.
  - no D91 generated artifact remains under versioned task artifact directories.
  - fresh D91 live counting report matched the final B13 metrics.

## Governance Verification
- Latest D91 governance sync completed after D91 documentation update.
- Latest D91 governance lint passed with the existing unrelated T-115 warning:
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
- D1-D91 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D91 completion details, D90 candidate-layer details, D89 completion details, D88 candidate-layer details, D87 completion details, D86 completion details, D85 candidate-layer details, D84 exploration details, and D65-D83 refill/promotion/B12 details are captured above and summarized in `10-scaleout-run-ledger.md`.
