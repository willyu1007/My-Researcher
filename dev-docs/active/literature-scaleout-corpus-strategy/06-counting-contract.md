# 06 Counting Contract

## Purpose
- Extend the T-120 counting convention for T-122 scaleout.
- Keep broad candidates, managed literature, effective literature, blockers, and non-corpus rows separate.
- Prevent B10 candidate discovery from changing managed-corpus or effective-literature progress metrics.

## Canonical Metrics

| Metric | Definition | Current Value | Use For |
| --- | --- | ---: | --- |
| `candidate_pool_records` | All `LiteratureDiscoveryCandidate` rows. | 62 | Broad discovery scale. |
| `candidate_pool_discovered_records` | Candidate rows with `status=DISCOVERED`. | 0 | Untouched B10 output. |
| `candidate_pool_accepted_records` | Candidate rows with `status=READY_FOR_PROMOTION` or `PROMOTED`. | 40 | B11 accepted candidate count. |
| `candidate_pool_ready_for_promotion_records` | Candidate rows with `status=READY_FOR_PROMOTION`. | 26 | B11 accepted but not promoted yet. |
| `candidate_pool_promoted_records` | Candidate rows with `status=PROMOTED`. | 14 | Candidates linked to managed `LiteratureRecord` rows. |
| `candidate_pool_rejected_records` | Candidate rows with `status=REJECTED`. | 4 | B11 or canary-quality rejected candidates. |
| `candidate_pool_duplicate_records` | Candidate rows with `status=DUPLICATE`. | 9 | Candidate-stage or promotion-time duplicates. |
| `candidate_pool_deferred_records` | Candidate rows with `status=DEFERRED`. | 9 | Candidates retained for later review. |
| `managed_corpus_records` | `LiteratureRecord` rows with stable corpus tags and no excluded-from-corpus tag. | 157 | Formal literature-management denominator. |
| `adaptive_corpus_records` | Compatibility alias for `managed_corpus_records`. | 157 | T-120 continuity. |
| `effective_literature_records` | Managed corpus rows with all standard stages through `INDEXED=SUCCEEDED`. | 157 | Evidence-ready literature. |
| `pipeline_complete_records` | Compatibility alias for `effective_literature_records`. | 157 | T-120 continuity. |
| `pipeline_incomplete_records` | Managed corpus rows that are not effective yet. | 0 | Standard pipeline throughput planning. |
| `pipeline_blocked_records` | Managed corpus rows with an explicit `FAILED` or `BLOCKED` stage. | 0 | Manual/OCR/source/provider follow-up. |
| `pipeline_not_started_records` | Managed corpus rows with all standard stages still `NOT_STARTED`. | 0 | Newly promoted records awaiting B12. |
| `excluded_non_corpus_records` | `LiteratureRecord` rows outside managed corpus. | 9 | Database hygiene only. |
| `db_total_records` | All `LiteratureRecord` rows. | 166 | Database hygiene only. |

## Layer Rules
- B10 writes only candidate pool records.
- B10 candidate rows do not count as `managed_corpus_records`.
- B10 candidate rows do not count as `effective_literature_records`.
- B11 promotion is the boundary from candidate pool to managed corpus.
- A promoted `LiteratureRecord` is managed literature, but not effective literature until the full standard pipeline succeeds.
- A promoted but not-started `LiteratureRecord` is pipeline-incomplete, not an explicit blocker.
- `pipeline_blocked_records` is reserved for explicit `FAILED` or `BLOCKED` stage detail.
- `adaptive_corpus_records` remains available as a compatibility metric, but new T-122 reporting should prefer `managed_corpus_records`.
- `pipeline_complete_records` remains available as a compatibility metric, but new T-122 reporting should prefer `effective_literature_records`.
- `db_total_records` must not be used as paper collection progress.

## Managed Corpus Predicate
- A `LiteratureRecord` is managed corpus when:
  - it has at least one stable corpus tag:
    - `collection:*`
    - `direction:*`
    - `batch:*`
    - `corpus:managed`
    - `corpus:effective`
  - and it does not have `classification:excluded-from-corpus`.

## Effective Literature Predicate
- A record is effective literature when:
  - it satisfies the managed corpus predicate.
  - every standard stage has `SUCCEEDED`:
    - `CITATION_NORMALIZED`
    - `ABSTRACT_READY`
    - `FULLTEXT_PREPROCESSED`
    - `KEY_CONTENT_READY`
    - `CHUNKED`
    - `EMBEDDED`
    - `INDEXED`

## Reproducible Report
- Script: `tools/literature-scaleout-counting-report.mjs`
- Latest artifact: `artifacts/20260607T-after-d23-source-blocker-soft-exclusion.json`
- Required command:

```bash
TS_NODE_TRANSPILE_ONLY=true SCALEOUT_COUNTING_RUN_ID=20260607T-after-d23-source-blocker-soft-exclusion \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/literature-scaleout-corpus-strategy/tools/literature-scaleout-counting-report.mjs
```

## Baseline Before B10 Apply Smoke

| Baseline | Value |
| --- | ---: |
| Candidate pool | 0 |
| Managed corpus | 146 |
| Effective literature | 144 |
| Manual blockers | 2 |
| Excluded/non-corpus records | 6 |
| Raw DB total | 152 |

## Current After D23 Source-Blocker Soft Exclusion

| Baseline | Value |
| --- | ---: |
| Candidate discovered | 0 |
| Candidate ready for promotion | 26 |
| Candidate promoted | 14 |
| Candidate duplicate | 9 |
| Candidate rejected | 4 |
| Candidate deferred | 9 |
| Candidate pool | 62 |
| Managed corpus | 157 |
| Effective literature | 157 |
| Pipeline incomplete | 0 |
| Explicit pipeline blockers | 0 |
| Pipeline not started | 0 |
| Excluded/non-corpus records | 9 |
| Raw DB total | 166 |

The source-access blocked records `LIT-0163`, `LIT-0166`, and `LIT-0257` are excluded from managed/effective resource-pool metrics until a rights-safe fulltext source is available. Default key-content remains `codex_curated`; `llm_gateway` is explicit-only for bounded provider retry diagnostics. The next B10 scaleout run should increase only the candidate pool unless paired with B11 promotion.
