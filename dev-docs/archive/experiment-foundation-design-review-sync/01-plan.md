# 01 Plan

## Phases
1. Review the external design report against `T-043`.
2. Split parent scope into child task packages.
3. Map every high-value review issue to an owner child.
4. Update parent planning docs and coverage matrix.
5. Run project governance sync and lint.

## Acceptance Criteria
- [x] Each child task has a clear owner boundary, non-goals, and done criteria.
- [x] `T-043` remains the parent task and single V1 umbrella.
- [x] S1 is split into S1-A core closed-loop contracts and S1-B extension shells.
- [x] No review issue remains unmapped without a written follow-up.

## Review Gate
- Before any child starts implementation, confirm its upstream contract dependencies are closed.
- Before handoff, re-check parent coverage matrix and project governance lint.
