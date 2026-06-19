# 03 Implementation Notes

## Execution Shape
- T-125 reused the T-122 B10/B11/B12/B13 operating model.
- The main change was scale: larger exact-source refill catalogs, larger source-stable promote tranches, and more aggressive B12 completion waves.
- The task also introduced matrix-aware collection pressure so RAG, serving/system, test-time, adjacent frontier, and theory-support lanes did not collapse into a single topic bucket.

## Key Decisions
- Prefer exact-source queries when broad provider searches produced too many duplicates or low-value tails.
- Promote only source-stable READY rows.
- Keep B11 status apply separate from B11 promote.
- Keep B12 completion as the effective-corpus gate.
- Stop broad T-125 collection once source-stable READY capacity was exhausted and hand off to T-126 for the 1500-record corpus objective.

## Archive Cleanup
- Per-round catalog, dry-run, apply, and B12 completion details were intentionally removed.
- The remaining package records the collection matrix, decisions, and final handoff state without retaining progress ledgers.
