# 01 Plan

## Phases
1. [x] Confirm upstream handoff fields from T-092.
2. [x] Define `ImplementationIntakeSnapshot` contract and hash semantics.
3. [x] Define `ImplementationProject` bootstrap command/read model.
4. [x] Define `ImplementationFeedbackEvent` contract for upstream recheck requests.
5. [x] Add stale/superseded/hash-mismatch handling.
6. [x] Verify bootstrap, idempotency, and upstream recheck behavior.

## Review Before Next Flow
- Confirmed created implementation root is not linked as mutable bridge state.
- Confirmed source refs support motive/evidence-board initialization through `handoff_to_motive`.
- Confirmed feedback/recheck event path is explicit for upstream corrections and cannot overwrite topic-selection authority.

## Verification
- Contract/schema tests passed.
- Backend service and route tests passed for T-093 paths.
- Negative tests cover inactive bridge, stale hash, duplicate bootstrap, missing source refs, and append-only upstream feedback boundary.
