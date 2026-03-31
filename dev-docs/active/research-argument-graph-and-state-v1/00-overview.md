# 00 Overview

## Status
- State: in-progress
- Next step: hand off the verified internal backend surface to `T-026` and `T-027`; no further T-025 product-surface work remains.

## Goal
- Deliver the minimum runnable backend foundation for the `research-argument` domain.
- Keep graph truth, abstract state, decision and lesson logs, and materialized read models coherent under synchronous recompute.
- Ground `EvaluationSoundness` and `ReproducibilityReadiness` in explicit `BaselineSet`, `Protocol`, `ReproItem`, `Run`, and `Artifact` records instead of placeholder labels.

## Non-goals
- Do not add public HTTP routes or controllers in T-025.
- Do not implement planner / critic / advisory execution.
- Do not rewrite `title-card` or `paper-project` public contracts.

## Context
- T-024 froze canonical research-argument contracts, glossary, and vocabulary in shared `research-lifecycle` modules.
- T-025 consumes those contracts and adds runtime persistence, state synthesis, logs, and read-model materialization only.
- T-026 and T-027 will consume the internal service and read-model surface added here.

## Acceptance Criteria
- [x] `dev-docs/active/research-argument-graph-and-state-v1/` contains `roadmap + 00~05 + .ai-task.yaml`.
- [x] The minimum graph object set is persisted through repository implementations.
- [x] 9-dimension `AbstractState` synthesis and recompute flow are implemented in the service layer.
- [x] Every graph mutation triggers synchronous recompute in the same transaction/service call.
- [x] Decision and lesson logs plus core read models are queryable.
- [x] `BaselineSet / Protocol / ReproItem / Run / Artifact` now feed `EvaluationSoundness` and `ReproducibilityReadiness`.
- [x] Persistence and read models preserve local-first, sync eligibility, Git weak mapping, and audit metadata hooks.
- [x] Backend typecheck, backend tests, shared tests, Prisma validation, DB context sync, and governance sync/lint pass.
