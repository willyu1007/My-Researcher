# 06 Counting Conventions

## Purpose
- Prevent `LiteratureRecord` table totals from being confused with the adaptive LLM systems paper corpus.
- Keep collection progress, pipeline progress, and database hygiene statistics separate.
- Provide a stable denominator before returning to literature collection scaleout.

## Canonical Metrics

| Metric | Definition | Current Value | Use For |
| --- | --- | ---: | --- |
| `db_total_records` | Every row in `LiteratureRecord`. Includes historical test/evidence rows. | 350 | Database hygiene only. Do not use as paper corpus progress. |
| `adaptive_corpus_records` | Records with at least one `collection:*`, `direction:*`, or `batch:*` tag. | 146 | Main literature collection denominator. |
| `pipeline_complete_records` | `adaptive_corpus_records` where `INDEXED=SUCCEEDED`. | 144 | Standard literature-management pipeline completion. |
| `pipeline_blocked_records` | `adaptive_corpus_records` not indexed, with a concrete blocker. | 2 | Manual/OCR/source follow-up. |
| `non_corpus_records` | Records without corpus tags. Mostly historical topic-selection evidence rows plus explicit exclusions. | 204 | Excluded from literature collection progress. |

## Counting Rules

- When reporting collected papers, use `adaptive_corpus_records`, not `db_total_records`.
- When reporting pipeline completion, use `pipeline_complete_records / adaptive_corpus_records`.
- When reporting remaining work for this collection round, use `pipeline_blocked_records`, not `db_total_records - pipeline_complete_records`.
- Historical topic-selection API/harness evidence rows are not missing papers. They are `non_corpus_records`.
- A record enters the adaptive corpus only after it receives at least one stable corpus tag:
  - `collection:*`
  - `direction:*`
  - `batch:*`
- Future large-scale collection batches must report both:
  - newly imported adaptive corpus records.
  - resulting adaptive corpus denominator after dedup/merge.

## Current Interpretation

- The phrase "300+ records" refers to raw database table size.
- It does not mean there are 300+ collected papers in the current adaptive LLM systems corpus.
- The current adaptive corpus is 146 records.
- The current actionable pipeline remainder is 2 records:
  - `LIT-0252`: `FULLTEXT_OCR_REQUIRED`; partial visual retrieval surface is available but standard `INDEXED` remains incomplete.
  - `LIT-0257`: `FULLTEXT_SOURCE_MISSING`.

## Reproducible Report

- Script: `tools/literature-counting-report.mjs`
- Latest artifact: `artifacts/20260604T-after-lit-0252-visual-index-counting.json`
- Required command:

```bash
TS_NODE_TRANSPILE_ONLY=true PIPELINE_CAMPAIGN_RUN_ID=20260604T-after-lit-0252-visual-index-counting \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/literature-counting-report.mjs
```

## Return-To-Collection Baseline

After this convention is applied, the collection mainline should track:

| Baseline | Value |
| --- | ---: |
| Current adaptive corpus | 146 |
| Indexed adaptive corpus | 144 |
| Manual blockers | 2 |
| Non-corpus/excluded records | 204 |

The next collection batches should increase `adaptive_corpus_records`; they should not try to process the 204 non-corpus/excluded records as papers.
