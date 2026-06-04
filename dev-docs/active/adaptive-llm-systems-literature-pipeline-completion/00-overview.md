# 00 Overview

## Status
- State: in-progress
- Next step: continue with the next controlled collection batch from the updated 146-record adaptive corpus denominator, while tracking `LIT-0252` as partial visual-indexed/OCR-blocked and `LIT-0257` as missing-source blocked.

## Goal
- Move the adaptive LLM systems collected literature from metadata-only collection into the standard literature pipeline.
- Target the collected corpus represented by namespaced collection/direction/batch tags, not historical topic-selection test records.
- Execute the pipeline incrementally:
  - fulltext acquisition.
  - citation normalization and abstract readiness.
  - fulltext preprocessing.
  - key-content extraction.
  - chunking, embedding, and indexing.

## Current Baseline
- DB currently contains many historical `Topic Selection v1b API Evidence...` records that are not corpus papers.
- The collected adaptive LLM systems target set is defined as records with at least one `collection:*`, `direction:*`, or `batch:*` tag.
- Counting convention is locked in `06-counting-conventions.md`; do not use raw `LiteratureRecord` table size as collection progress.
- Raw DB count: 350 `LiteratureRecord` rows.
- Current adaptive corpus count: 146 tagged records.
- Current pipeline-complete adaptive corpus count: 144 indexed records.
- Current actionable adaptive corpus blockers: 2 records.
- Excluded non-corpus records: 204 rows, mostly historical topic-selection API/harness evidence records plus the B9 withdrawn exclusion.
- B9 new collection round:
  - 22 records imported through controlled metadata import.
  - 21 records kept as valid adaptive corpus records and completed through `INDEXED`.
  - 1 record (`LIT-0337`, SparKV) was excluded from the adaptive corpus because arXiv marks it withdrawn and the PDF URL returns 404.
- Completed in this pass:
  - 125/125 target records have citation normalization complete.
  - 125/125 target records have `ABSTRACT_READY`.
  - 109/125 target records have raw fulltext assets.
  - 109/109 arXiv target records have acquired raw PDFs.
- Current content state:
  - 145/146 target records have raw fulltext assets after public PDF source recovery and B9 arXiv acquisition.
  - 144/146 target records have `FULLTEXT_PREPROCESSED`.
  - 145/146 target records have `KEY_CONTENT_READY`.
    - 144 are lightweight `codex_curated` standard-pipeline dossiers.
    - 1 is `LIT-0252` `manual_visual_curated` partial-ready key content.
  - 144/146 target records have standard `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - 145/146 target records have embedding chunks.
    - 144 are standard indexed embedding versions.
    - 1 is `LIT-0252` active `PARTIAL_INDEXED` visual embedding version.
  - 2 target records remain incomplete:
    - `LIT-0252`: public PDF acquired, GROBID reports `FULLTEXT_OCR_REQUIRED`, partial visual index is available.
    - `LIT-0257`: book record; no public fulltext asset found, still `FULLTEXT_SOURCE_MISSING`.
- GROBID is running in Docker via `pea-grobid-e2e` on `http://localhost:8070`.
- `UNPAYWALL_EMAIL` is set in `.env.local`; it is not persisted in the application settings row.

## Return-To-Collection Baseline
- Main denominator: `adaptive_corpus_records`, currently 146.
- Main completion ratio: `pipeline_complete_records / adaptive_corpus_records`, currently 144/146.
- New literature collection batches must increase `adaptive_corpus_records` through stable corpus tags.
- The 204 non-corpus rows are database hygiene context, not pending papers for the literature pipeline.
- New batches must preserve direction tags for:
  - `direction:rag-aware-allocation`.
  - `direction:llm-serving-resource-allocation`.
  - `direction:test-time-compute-budgeting`.
- New batches should also preserve collection role tags for `collection:core`, `collection:system-support`, `collection:strategy-support`, and `collection:theory-support`.

## Scope
- Use existing backend routes and services only; no schema or API change.
- Create auditable campaign artifacts and safety counters.
- Start with dry-runs and small canary batches before scaling.
- Exclude non-paper/test evidence records.

## Non-goals
- Do not delete historical test records in this task.
- Do not force `INDEXED` completion while GROBID is unavailable.
- Do not override rights policy for `RESTRICTED` or `USER_AUTH` records.
- Do not run unbounded provider calls without dry-run estimates and budgets.

## Acceptance Criteria
- [x] Target set is explicit and excludes non-paper test records.
- [x] Fulltext acquisition dry-run and canary job are recorded.
- [x] Metadata/abstract backfill canary is recorded.
- [x] Batch arXiv acquisition is recorded.
- [x] Batch metadata/abstract completion is recorded.
- [x] GROBID blocker is either cleared or documented with exact next action.
- [x] GROBID-ready `FULLTEXT_PREPROCESSED` canary succeeds.
- [x] `INDEXED` canary succeeds before batch scaleout.
- [x] Asset-backed batch scaleout reaches `INDEXED`.
- [x] Public PDF recovery is attempted and recorded for the remaining missing-asset records.
- [x] Counting convention distinguishes DB table totals from adaptive corpus progress.
- [x] New collection round plan is documented without treating non-corpus evidence rows as pending papers.
- [x] B9 controlled collection batch has query-ledger, candidate manifest, import report, and pipeline status artifacts.
- [x] B9 valid corpus records complete the standard literature pipeline through `INDEXED`.
- [x] LIT-0252 OCR blocker is preserved while a partial visual retrieval surface is created and verified.
- [x] Governance sync/lint passes.
