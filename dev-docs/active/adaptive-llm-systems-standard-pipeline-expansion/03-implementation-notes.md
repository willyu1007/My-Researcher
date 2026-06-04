# 03 Implementation Notes

## 2026-06-04 - Task Package Created
- Created `T-119 adaptive-llm-systems-standard-pipeline-expansion`.
- Decision: this is a new literature mainline task because T-116 is already closed and T-118/F3 is experiment-foundation adjacent.
- Decision: use the standard T-116 import boundary: metadata import, source provenance, tags, and safety counters only.

## 2026-06-04 - B7 Frontier Three-Direction Expansion
- Added `tools/b7-frontier-three-direction-expansion.mjs`.
- Initial arXiv API search hit `429`, so the batch switched to exact-id sequential metadata fetch from arXiv HTML pages.
- Ran dry-run first:
  - discovered 20 candidates after the focused strategy-plan refinement.
  - found 2 existing DB matches.
  - selected 15 import candidates before extending timeout.
- Ran apply with a longer timeout:
  - discovered 21 exact-id candidates.
  - found 2 existing DB matches.
  - imported 16 new literature records and 16 sources.
- New records:
  - `LIT-0290` through `LIT-0305`.
- Safety counters for pipeline runs, content assets, content-processing batch jobs, and fulltext acquisition jobs stayed unchanged.
- Decision: keep B7 as metadata/tag expansion only; judgment cards and fulltext readiness are follow-up work.
