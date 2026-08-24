# 01 Plan

## Phase 1 - Boundary Inventory
- Inspect current Fastify routes, services, repositories, shared contracts, and Prisma models for:
  - `PaperProjectBridge` read/creation paths;
  - `PaperProject` creation paths;
  - title-card promotion legacy paths;
  - downstream recheck/risk memory paths.
- Decide which paths are implemented enough for acceptance and which are deferred product gaps.

## Phase 2 - Bridge Consumption Acceptance
- Implement explicit bridge-to-PaperProject intake and test:
  - active bridge only;
  - bridge hash / source promotion decision lineage;
  - selected literature evidence carry-forward;
  - accepted-risk and promotion condition propagation;
  - duplicate/idempotency behavior;
  - persistent `paper_project_intake_ref` and `target_paper_project_ref` on the bridge.

## Phase 3 - Recheck Loopback Acceptance
- Extend existing downstream feedback/recheck coverage to assert:
  - each recheck request has loopback target, cause, source bridge ref, promotion snapshot ref/hash, and required action;
  - no-recheck feedback remains non-actionable;
  - recheck risk memory event/impact refs are persisted and retrievable where applicable;
  - loopback routing can discriminate v1a/v1b/v1c targets.

## Phase 4 - Real-Flow Evidence
- Reuse the latest real-flow artifact when possible.
- If necessary, run a smaller mock flow first and only rerun provider flow for uncovered behavior.
- Record DB readback evidence for any persisted downstream objects.

## Phase 5 - Closure
- Run targeted backend tests, backend typecheck, governance sync/lint, and `git diff --check`.
- Update implementation notes, verification, and pitfalls.
