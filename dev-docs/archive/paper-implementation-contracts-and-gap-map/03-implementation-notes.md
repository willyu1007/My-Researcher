# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-092` as the first child task under `T-091`.
- Scope is planning and contract/gap mapping only.
- No product code changes were made.

## 2026-05-20 - Contract And Gap Map Landed
- Added `06-object-and-component-map.md` with PaperImplementation object ownership and design runtime component ownership.
- Added `07-current-state-gap-map.md` with repo asset classification:
  - `PaperProjectBridge` is adapt-only upstream handoff material;
  - retired pre-writing control-plane artifacts are historical material only;
  - `experiment-foundation` is consumed by refs/hashes, not copied;
  - topic-selection runtime and desktop patterns are reusable as patterns only;
  - PaperImplementation domain contracts are missing and owned by T-093 through T-101.
- Added `08-queryability-field-matrix.md` so later tasks know which gate/queue/trace/test fields must not remain JSON-only.
- Added `09-child-readiness-checklist.md` with the confirmed next order: T-093, T-097, T-094, T-095, T-096, T-098, T-099, T-100, T-101.
- Confirmed no high-risk design-doc gap remains unowned.
- Marked T-092 as done after planning artifacts and governance checks.

## 2026-05-20 - Review Fixes
- Clarified in parent coverage review that the D10 child package order is a coverage inventory, not the execution order.
- Re-affirmed the execution baseline as T-093, T-097, T-094, T-095, T-096, T-098, T-099, T-100, T-101.
- Tightened verification language so the broad `apps packages docs dev-docs` scan is treated as discovery only.
- Added code-surface checks under `packages apps docs` and `packages apps` to support the repo-state conclusions without relying on planning-doc self-matches.

## Open Notes
- T-093 is the next implementation entry.
- T-097 should start early enough to define trace prerequisites before downstream writing-affecting objects are implemented.
