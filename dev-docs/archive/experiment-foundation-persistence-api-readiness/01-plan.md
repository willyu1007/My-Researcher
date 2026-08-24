# 01 Plan

## Phases
1. Confirm S1 contracts are stable.
2. Add Prisma models through DB SSOT only when approved.
3. Implement repository interfaces returning domain DTOs.
4. Implement services for assets, candidates, readiness, recipe/run-recipe records, materialization request records, results, evidence, and sidecars.
5. Implement REST routes and integration tests.
6. Refresh docs/context after schema changes.

## Acceptance Criteria
- [x] Repository layer hides Prisma from business services.
- [x] Readiness gates block missing hashes/locks, stale mirrors, non-ready dataset versions, invalid result states, and unsafe candidates in the minimum loop.
- [x] APIs never expose secrets or platform-private adapter payloads.
- [x] DB stores metadata, refs, hashes, statuses, and frozen payload JSON only; large artifacts live behind file/cloud refs.
- [x] Candidate promotion persistence records request/result records, checks existing canonical refs, and does not synthesize canonical DTOs.

## Review Gate
- Do not start until relevant S1 child contracts are complete.
- Before handoff, run DB/context sync and backend tests.
