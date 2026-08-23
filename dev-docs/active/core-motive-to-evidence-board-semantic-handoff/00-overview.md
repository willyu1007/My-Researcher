# T-141 CoreMotive to Evidence Board Semantic Handoff

## Status

- State: done
- Next step: evaluate T-142 only when the Evidence Board-to-ValidationCycle semantic continuation is prioritized.

## Goal

Give an LLM one semantic command that starts from an existing `ImplementationProject` with an admitted first-primary CoreMotive and creates or recovers exactly one current fresh, trace-complete Evidence Board without caller-side technical orchestration.

## Non-goals

- Do not create ValidationCycle, WorkOrder, experiment, Result, Claim, or Dossier authority.
- Do not trigger PAI or accept credentials/cost authorization.
- Do not fabricate evidence/locator/citation/binding semantics or promote gap/blocked/stale candidates.
- Do not change UI, auth, database schema, or T-136 through T-140 authority.
- Do not add a workflow engine, second coordinator, dynamic stage graph, or task-local continuation state.

## Context

T-140 produces an admitted CoreMotive and assertions, while T-095 validation planning requires a current fresh, trace-complete Evidence Board. T-137 proved this gap in a real canary but filled it with fixed SciFact-specific script logic. T-141 productizes only the generic semantic seam by reusing the existing evidence-board curation runtime and deterministic board/trace owners.

## Acceptance criteria

- [x] `POST /paper-implementation/evidence-board-handoffs` accepts exactly one field: `implementation_project_id`.
- [x] The server resolves admitted motive/assertions and traceable persisted source/evidence context.
- [x] Existing `evidence-board-curation` initial-seeding capability is reused; no duplicate runtime/profile/prompt is introduced.
- [x] Only viable, fresh, challenge-passed candidates covering every core/must-hold assertion can create an eligible board.
- [x] Evidence gaps return explicit blockers and create no misleading board authority.
- [x] Board, binding, trace, curation runtime, and coordinator effects recover from persisted owners without duplicates.
- [x] Replay/concurrency tests demonstrate exact-once behavior in the supported local backend process.
- [x] T-139 still reports `VALIDATION_PLANNING_RUN_NOT_STARTED` after successful T-141 completion.
- [x] No ValidationCycle, provider experiment, or PAI Job is created.
- [x] Focused/full tests, typecheck, LLM release, Context/API, project-state, governance, docs, diff, and CI gates pass.
