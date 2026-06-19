# 03 Implementation Notes

## Final Model
- T-122 introduced the candidate staging layer used by later literature collection work.
- Candidate discovery, triage/promotion, standard pipeline completion, and counting were separated into B10/B11/B12/B13 responsibilities.
- Candidate rows were treated as discovery inventory, not corpus records.
- Effective literature required full standard pipeline completion through `INDEXED`.

## Operational Lessons
- Source-backed tranches produced the fastest safe effective-corpus growth.
- Broad discovery was useful for recall, but promotion needed source stability and duplicate checks.
- Counting had to separate raw DB literature, managed corpus, effective literature, excluded non-corpus rows, and candidate pool state.
- Generated run artifacts should stay outside versioned docs.

## Archive Cleanup
- Historical per-round command logs, run IDs, candidate dumps, and generated artifact indexes were removed from this archived file.
- The final state and verification properties are preserved in `00-overview.md` and `04-verification.md`.
