# 04 Verification

## Verification Policy
- B10/B11/B12 DB-writing runs require:
  - pre-run B13 counting when the run changes corpus state.
  - dry-run artifact before any apply.
  - post-run B13 counting after apply.
  - generated artifacts stored under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Versioned `dev-docs/active/literature-scaleout-corpus-strategy/artifacts` may keep small DB/env markdown audit notes, but generated JSON run artifacts are ignored.
- Documentation-only cleanup requires:
  - markdown diff whitespace check.
  - governance sync.
  - governance lint.
- Database schema changes require the repo-prisma DB SSOT workflow and a separate scoped migration checkpoint.

## Latest Verified Corpus Checkpoint
- Checkpoint: D94 existing READY source-stable promote/B12 completion.
- Status: completed.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d94-before-ready-tranche.json`
  - `20260610T-d94-ready-pool-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d94-source-stable-ready-selector-b11-source-available-selector.json`
  - `20260610T-d94-source-stable-ready-selector-preprint-b11-source-available-selector.json`
  - `20260610T-d94-source-stable-ready-manual-selection.json`
  - `20260610T-d94-source-stable-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d94-source-stable-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d94-source-stable-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d94-source-stable-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d94-source-stable-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d94-source-stable-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d94-source-stable-key-content-apply-key-content-curated-apply.json`
  - `20260610T-d94-source-stable-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d94-source-stable-final-state-all-stages-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d94-source-stable-record-state-probe.json`
  - `20260610T-d94-after-b12.json`
- Result:
  - D94 audited the 81-record READY pool, rejected strict arXiv/ACL selector output as 0, and manually selected 4 direct `preprints.org` source-stable candidates.
  - D94 promoted and completed those 4 records as `LIT-0630`-`LIT-0633`.
  - all 4 records completed through `INDEXED`.
  - Final B13 count reports managed/effective corpus 431/431 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Verification

| Metric | Value |
| --- | ---: |
| Candidate batches | 34 |
| Candidate pool records | 674 |
| Candidate discovered records | 0 |
| Candidate ready-for-promotion records | 77 |
| Candidate promoted records | 304 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 134 |
| Candidate rejected records | 20 |
| Managed corpus records | 431 |
| Effective literature records | 431 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 25 |

## Latest B10 Candidate Refill Checkpoint
- Checkpoint: D92 adjacent-topic clean5 refill.
- Status: completed candidate-layer write and B11 status apply; no promotion was run in D92.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d92-before-b10.json`
  - `20260610T-d92-adjacent-broad-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d92-rag-testtime-focused-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d92-adjacent-clean5-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d92-adjacent-clean5-apply-b10-candidate-discovery-report.json`
  - `20260610T-d92-adjacent-clean3-retry-apply-b10-candidate-discovery-report.json`
  - `20260610T-d92-adjacent-clean5-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d92-adjacent-clean5-b11-apply-b11-candidate-triage-report.json`
  - `20260610T-d92-after-b10-b11.json`
- Result:
  - D92 broad scout produced 62 source-backed dry-run candidates with no DB writes.
  - D92 RAG/test-time focused scout produced 4 source-backed dry-run candidates with no DB writes.
  - D92 clean5 B10 apply plus provider-failure retry persisted 5 source-backed `DISCOVERED` candidates and created no `LiteratureRecord` rows.
  - D92 B11 apply marked all 5 candidates `READY_FOR_PROMOTION`; the ready subset was promoted and completed in D93.
  - Final D94 B13 count reports candidate pool 674, `DISCOVERED` 0, managed/effective 431/431, and 0 managed blockers after a separate existing-READY source-stable tranche.

## Latest Read-Only Selector Checkpoint
- Checkpoint: D94 existing READY source-stable selector dry-runs.
- Status: completed read-only.
- Evidence root: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Key artifacts:
  - `20260610T-d94-ready-pool-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d94-source-stable-ready-selector-b11-source-available-selector.json`
  - `20260610T-d94-source-stable-ready-selector-preprint-b11-source-available-selector.json`
  - `20260610T-d94-source-stable-ready-manual-selection.json`
- Result:
  - current B11 dry-run over 81 READY candidates retained 81 high-band rows for review.
  - strict arXiv/ACL selector selected 0 because eligible rows were application or direction tails.
  - adding preprint sources surfaced 5 candidates; TechRxiv and no-direct-PDF rows were excluded, leaving 4 direct `preprints.org` source-stable candidates for promotion.

## Latest Tool Verification
- Status: completed after D94 existing READY source-stable promote/B12 completion and documentation update.
- Commands:
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-fulltext-acquisition-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-content-backfill-pilot.mjs`
  - `node --check dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
  - `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/key-content-curated-dossier-runner.mjs`
  - `git diff --check -- dev-docs/active/literature-scaleout-corpus-strategy`
  - `find dev-docs/active/literature-scaleout-corpus-strategy/artifacts dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts -maxdepth 1 -type f -name '20260610T-d94*.json' -print`
  - `SCALEOUT_COUNTING_RUN_ID=20260610T-d94-after-b12 TS_NODE_PROJECT=apps/backend/tsconfig.json TS_NODE_TRANSPILE_ONLY=1 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs`
- Result:
  - B10 candidate discovery syntax check passed.
  - B11 triage/promote syntax check passed.
  - B12 standard pipeline syntax check passed.
  - B12 fulltext acquisition syntax check passed.
  - B12 content backfill syntax check passed.
  - B13 counting report syntax check passed.
  - curated dossier runner syntax check passed.
  - markdown diff whitespace check passed.
  - no D94 generated artifact remains under versioned task artifact directories.
  - fresh D94 live counting report matched the final B13 metrics.

## Governance Verification
- Latest D94 governance sync completed after D94 documentation update.
- Latest D94 governance lint passed with the existing unrelated T-115 warning:
  - `T-115 topic-selection-v1b-human-review-path` is `done` while its historical overview acceptance checklist remains unchecked.
- Treat the T-115 warning as out of scope for T-122 literature work unless the user asks to clean that task package.

## D95 Generated Artifact Hygiene
- Scope:
  - removed generated JSON run reports from versioned `dev-docs/active/literature-scaleout-corpus-strategy/artifacts`.
  - kept DB/env markdown audit notes under versioned artifacts.
  - added an artifacts-local `.gitignore` so future generated JSON stays out of git.
- Evidence policy after cleanup:
  - compact evidence indexes remain in this document and `10-scaleout-run-ledger.md`.
  - full generated JSON evidence belongs under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
  - historical deleted JSON remains recoverable from git history if needed.

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
- D1-D94 verification details have been compacted into `10-scaleout-run-ledger.md`.
- Full generated JSON evidence remains under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Previous expanded verification logs remain available in git history before the D56 documentation cleanup.
- D94 completion details, D93 completion details, D92 candidate-layer details, D91 completion details, D90 candidate-layer details, D89 completion details, D88 candidate-layer details, D87 completion details, D86 completion details, D85 candidate-layer details, D84 exploration details, and D65-D83 refill/promotion/B12 details are captured above and summarized in `10-scaleout-run-ledger.md`.
