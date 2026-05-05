# 01 Plan

## Phase A - Retrieve Contract
- Add profile/filter request shape.
- Add score/provenance response shape.

## Phase B - Retrieve Service
- Query embedding using active profile.
- Hybrid vector + BM25 + metadata filtering.
- Return provenance and score breakdown.

## Phase C - Stale/Trigger
- Implement `STALE` propagation.
- Implement recommended actions.
- Ensure stale never auto-enqueues.

## Phase D - Desktop
- Keep overview row actions lightweight.
- Add or update detail/workbench controls.

## Phase E - Verification Baseline
- Retrieve profile tests.
- Query embedding cache tests.
- Stale propagation matrix tests.
- Desktop typecheck/build and UI smoke tests.
