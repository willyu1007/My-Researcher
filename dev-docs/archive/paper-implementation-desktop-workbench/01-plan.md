# 01 Plan

## Phases
1. [x] Review backend command/read-model contracts from T-093 through T-099.
2. [x] Define coarse workbench route/module placement under `论文管理`.
3. [x] Define queue-first read model consumption and command surfaces.
4. [x] Implement motive/evidence/portfolio, cycle/workorder, upstream feedback, trace, claim/dossier, and confirmation views as backend-backed panels.
5. [x] Verify UI cannot bypass backend commands or style governance.

## Review Before Next Flow
- T-101 should exercise UI command paths through route-level substitutes or renderer tests once a browser test harness is configured.
- Portfolio decisions, upstream feedback candidates, validation loop-budget review items, trace repair queue items, and decision work queue items are exposed as backend read-models.
- UI completion state is not derived from mock-only readiness; readiness remains in backend dossier/gate/read-model objects.

## Verification
- UI contract/gate checks.
- Playwright/screenshot checks when UI implementation begins.
- Governance check for `data-ui` and retired style-layer constraints.
