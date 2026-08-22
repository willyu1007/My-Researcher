# T-139 Paper Implementation to Scientific Dossier Semantic Continuation

## Status

- State: in-progress
- Next step: finish full verification, archive the task, and land the verified change.

## Goal

Give an LLM one stable owner-root command for an existing `ImplementationProject`. The command derives the current scientific stage from persisted owner authority, reuses completed effects, resumes at most one already-persisted coordinator lane, and returns the next executable action or an explicit blocker without caller-side ID/hash shuttling.

## Delivered boundary

- `POST /paper-implementation/scientific-continuations`
- Strict request: `implementation_project_id` only.
- Read-only owner-state projection plus a pure ordered stage resolver; no continuation row or workflow graph.
- Exact terminal replay of an existing trace-complete `ready_for_writing` Dossier with zero writes.
- Recovery of at most one eligible already-persisted Paper Implementation coordinator run.
- Explicit stage, performed/reused effects, next action, blocker, technical lineage, and repeat-from-owner resume policy.
- Current D-19 `2/2/17/1/1` dependency shape and exact two-cell support check before the paid boundary.

## Explicit non-goals

- Do not create a new coordinator run or bootstrap a first CoreMotive from T-138 topic semantics. Missing CoreMotive returns `CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED`; a separately governed Topic-to-CoreMotive lane is a follow-up.
- Do not synthesize Result/scientific-validation, ResultAnalysis/Closure, or Claim/Dossier commands. T-139 reports those uncomposed boundaries and preserves their existing authority owners.
- Do not automatically discover or select Literature-to-Experiment assets, a ValidationCycle, or an experiment branch.
- Do not start or authorize a real PAI Job. Credentials and cost authorization are absent from this contract.
- Do not generalize beyond the currently enforced D-19-shaped, exact two-cell scientific envelope.
- Do not change UI/UX, authentication, database schema, provider behavior, or T-136/T-137/T-138 authority.

## Confirmed gap

T-138 creates/resumes the PaperProject and ImplementationProject roots, while the existing coordinator requires task-specific semantic authority and cannot bootstrap the first CoreMotive. Existing downstream services are individually usable, and T-137 proves their fixed SciFact path, but no general product service can safely compose every missing semantic/domain transition. The thinnest truthful seam is therefore an owner-state status/resume surface, not a second coordinator or an overstated one-click workflow.

## Acceptance criteria

- [x] The command accepts only an existing `implementation_project_id`; downstream ids, hashes, stages, scientific values, model options, credentials, and authorization are rejected.
- [x] The response separates semantic stage, completed effects, next action, blocker, technical lineage, and a fixed persisted-owner-state resume policy.
- [x] Stage is derived from existing owners; no new continuation persistence, workflow engine, authority writer, coordinator run, provider Attempt, or PAI Job is created.
- [x] One request may advance at most one already-persisted coordinator lane, then rereads owners before responding.
- [x] Ambiguous scientific selections, unsupported experiment envelopes, paid execution, provider progress, human confirmation, and uncomposed semantic/domain transitions are explicit.
- [x] Existing T-137 terminal authority replays credential-free as `ready_for_writing` with stable lineage and zero performed effects.
- [ ] Full shared/backend tests and typecheck, OpenAPI/Context, project-state, governance, documentation lint, and `git diff --check` pass.
