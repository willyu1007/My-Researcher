# 01 Plan

## Phase A - Inventory
- Locate all shared DTOs, backend orchestrator constants, action builders, frontend normalizers, OpenAPI, and tests that encode stage order/status/actions.

## Phase B - Contract Replacement
- Add `STALE` as a first-class stage status.
- Replace old order with the agreed semantic order.
- Update action codes and requested stage semantics for explicit content-processing.

## Phase C - Consumer Migration
- Update backend services/controllers/tests.
- Update desktop overview normalizers and actions.
- Regenerate OpenAPI/API index.

## Phase D - Verification Baseline
- Shared typecheck/schema tests.
- Backend typecheck and route/service tests.
- Desktop typecheck/build.
- Contract diff review to ensure no compatibility aliases or dual semantics remain.
