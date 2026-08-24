# T-144 ValidationCycle Handoff Deep Cleanup

## Status

- State: in-progress
- Next step: commit and push the locally verified implementation, then confirm GitHub Actions before closing T-144.

## Goal

Make the EvidenceBoard-to-ValidationCycle handoff recovery boundary runtime-safe and easier to maintain without changing its request, response, authority ownership, or side effects.

## Non-goals

- Do not reopen T-142 or T-143.
- Do not add an endpoint, coordinator, workflow state, database migration, prompt, model profile, or configuration key.
- Do not change scientific values, existing ValidationCycle authority, provider behavior, or paid-execution authorization.
- Do not refactor unrelated Paper Implementation or Experiment Foundation modules.
- Do not split files merely to reduce line count; every extraction must isolate one coherent reusable invariant boundary.

## Context

The T-143 implementation is correct and fully green, but its post-landing module is 1,381 lines and mixes application orchestration with pure deterministic authority comparison. Its unit fixture also constructs a partial runtime envelope and a planning payload that cannot satisfy the shared runtime schema. Because persisted JSON is read through a TypeScript cast, a malformed but hash-consistent payload can escape the intended authority-conflict path.

## Acceptance criteria (high level)

- [x] Persisted ValidationCycle planning payloads are validated against the shared runtime schema before field access or authority writes.
- [x] Malformed, extra-field, or incomplete hash-consistent payloads fail as deterministic `VERSION_CONFLICT` errors with zero ValidationCycle/Trace writes.
- [x] The handoff fixture models a complete runtime envelope and a schema-valid two-candidate planning artifact without broad type assertions.
- [x] Pure ref, deterministic-run, trace, and ValidationCycle comparison logic is isolated from the application orchestration service.
- [x] No public API, app wiring, repository interface, database schema, LLM configuration, or side-effect boundary changes.
- [ ] Focused and full Node 20 tests, typecheck, Context/API, project-state, governance, docs, diff, and CI gates pass. Local gates pass; remote CI remains.
