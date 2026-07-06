# 00 Overview

## Status
- State: done
- Result: explicit `PaperProjectBridge` -> PaperProject intake and downstream feedback/recheck contracts are covered with deeper post-v1c invariants, including hash immutability, evidence basket priority, stale duplicate rejection, append-only feedback, and Prisma-backed route readback.

## Parent And Scope Source
- Parent topic-selection implementation package: `dev-docs/archive/topic-selection-decision-chain-redesign/`
- Prior backend decision-chain acceptance: `dev-docs/active/topic-selection-backend-decision-chain-acceptance/`
- Related research-argument umbrella: `dev-docs/archive/research-argument-control-plane-v1/`

## Goal
- Verify what happens after v1c creates an active `PaperProjectBridge`.
- Cover the boundary between topic selection and downstream paper/research-argument execution without pretending that unfinished downstream modules are complete.
- Verify that downstream feedback/recheck artifacts can be consumed as loopback signals and do not mutate upstream topic-selection authority.

## Non-goals
- Do not build the full research-argument planner/critic runtime.
- Do not build desktop UI.
- Do not rewrite PaperProject version-spine or writing package contracts unless a concrete acceptance blocker requires a scoped fix.
- Do not reopen T-068; this task starts after T-068's bridge/recheck acceptance point.

## Acceptance Criteria
- [x] Inventory existing PaperProjectBridge downstream consumers and classify implemented vs missing product paths.
- [x] Add route/service-level acceptance coverage for the implemented bridge-to-downstream feedback/recheck boundary.
- [x] Verify current PaperProject creation paths do not consume v1c bridge authority and record this as a product gap rather than a passed downstream handoff.
- [x] Verify downstream recheck requests can be read back with enough target/cause/authority refs to drive v1a/v1b/v1c loopback routing.
- [x] Verify negative cases already implemented for this boundary: inactive/missing bridge, workspace drift, and no-recheck feedback.
- [x] Verify explicit bridge-to-PaperProject intake enforces active bridge, bridge hash precondition, workspace guard, evidence carry-forward, idempotent duplicate calls, and persisted refs.
- [x] Verify stale bridge hash on the explicit intake path returns `VERSION_CONFLICT` before any downstream PaperProject creation.
- [x] Verify duplicate intake with stale hash is rejected after bridge consumption and does not create another PaperProject.
- [x] Verify explicit selected literature IDs are preferred over fallback evidence refs, while empty evidence baskets block intake.
- [x] Verify bridge payload hash, working-copy hash, promotion snapshot hash, and source promotion lineage do not mutate after intake or downstream feedback.
- [x] Keep full research-argument planner/critic execution out of scope; the implemented downstream consumer is PaperProject intake, not research-argument runtime.
