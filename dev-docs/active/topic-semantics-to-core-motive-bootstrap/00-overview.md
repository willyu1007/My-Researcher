# T-140 Topic Semantics to CoreMotive Bootstrap

## Status

- State: done
- Next step: evaluate T-141 only when an owner-root validation-planning continuation is prioritized.

## Goal

Give an LLM one semantic command that starts from an existing `ImplementationProject`, restores T-138 topic semantics, and creates or recovers exactly one admitted first-primary CoreMotive without caller-side technical orchestration.

## Non-goals

- Do not create or advance a coordinator run, ValidationCycle, WorkOrder, experiment, Result, Claim, or Dossier.
- Do not trigger PAI or accept credentials/cost authorization.
- Do not change UI, auth, database schema, or existing T-136 through T-139 authority.
- Do not let the LLM/caller assign authority ids, refs, hashes, admission status, or scientific lineage.
- Do not add a workflow engine, stage graph, or task-local continuation state.

## Context

T-138 gives the product a bare `ImplementationProject` with stable topic semantics. The existing Paper Implementation coordinator cannot bootstrap the first CoreMotive because it requires an already-existing target motive/version/assertion set. T-139 therefore reports `CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED`. T-140 fills only this seam: proposal semantics come from a dedicated versioned LLM artifact, while existing deterministic services remain the scientific authority writers.

## Acceptance criteria

- [x] `POST /paper-implementation/core-motive-handoffs` accepts exactly one field: `implementation_project_id`.
- [x] The server restores the accepted intake snapshot and preserves all T-138 scientific constraints.
- [x] A dedicated `CoreMotiveBootstrapProposal@v1` profile/prompt/artifact is called once only when not already persisted.
- [x] Deterministic logic creates the CoreMotive draft, complete trace, and first-primary admission through existing owners.
- [x] Replay and interruption recovery reuse proposal, motive, assertions, trace, and admission without duplicates.
- [x] Concurrent requests converge to one authority chain in the local backend process; storage conflicts are reread and reconciled.
- [x] The response separates semantic stage, performed/reused effects, next action/blocker, technical lineage, and resume policy.
- [x] T-139 reports `VALIDATION_PLANNING_RUN_NOT_STARTED` after successful bootstrap.
- [x] No coordinator run, provider experiment, or PAI Job is created.
- [x] Focused/full tests, typecheck, LLM registry, Context/API, project-state, governance, docs, diff, and CI gates pass.
