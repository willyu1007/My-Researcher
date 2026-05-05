# 01 Plan

## Phase A - Cutover Inventory
- Search for old pipeline naming, old stage order, placeholder runtime, hash embedding default, and compatibility assumptions.

## Phase B - Cleanup
- Remove obsolete code paths after replacement tasks land.
- Ensure dev/test fallbacks are clearly named and cannot silently act as production.

## Phase C - End-To-End Verification
- Backend integration tests.
- Shared schema tests.
- Desktop typecheck/build.
- OpenAPI/API index checks.
- Retrieval smoke tests.
- Stale/backfill dry-run tests.

## Phase D - Handoff
- Update parent `T-030`.
- Decide which child tasks are done or still active.
- Archive completed task bundles only after verification passes.
