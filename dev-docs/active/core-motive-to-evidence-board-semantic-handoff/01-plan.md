# T-141 Implementation Plan

## Phases

1. [x] Prove generic persisted source/evidence resolution and existing curation-lane reuse.
2. [x] Define strict owner-root contracts and stable recovery identity.
3. [x] Compose initial curation into existing trace/binding/board owners with conservative admission.
4. [x] Expose the semantic command and prove blockers, replay, concurrency, and T-139 boundary behavior.
5. [ ] Update context/governance docs and run full release gates.

## Detailed steps

1. Trace accepted intake/literature refs to repository-owned locators, citations, evidence refs, hashes, and context packets required by `seed_initial_board_candidates`.
2. Stop and report if that mapping requires invented science, a new evidence authority, or a schema change; otherwise add only the thinnest read-only resolver seam.
3. Add strict request, semantic response, effects, blocker, lineage, and resume-policy schemas; reject every request field except `implementation_project_id`.
4. Derive deterministic curation run/artifact and board/binding/trace identities from project, admitted motive version, source snapshot, and immutable runtime/profile versions.
5. Recover an existing eligible board and its source/citation lineage read-only before creating any citation, coordinator, runtime, trace, or board effect.
6. Reuse the existing `evidence-board-curation` lane with `curation_mode=seed_initial_board_candidates`; server assigns every technical runtime field.
7. Read the persisted curation result and accept only `viable_binding`, `passed`, `fresh`, non-blocked candidates that meet their assertion minimum support level and have resolvable source/evidence lineage.
8. Require coverage for every core/must-hold assertion unless existing accepted-risk authority satisfies the domain writer; never synthesize coverage.
9. Map accepted candidate semantics conservatively into the existing binding DTO and ensure complete trace for board and bindings.
10. Call the existing Evidence Board writer with deterministic identities; reread and reconcile unique/conflict outcomes.
11. Return the first incomplete semantic step plus performed/reused effects; replay from owner state.
12. Verify T-139 reaches only its existing validation-planning blocker and T-141 creates no downstream/paid effects.

## Phase acceptance

- Discovery: generic source/evidence lineage is resolved without fixed research semantics or authority expansion.
- Contract: exactly one caller field; technical runtime/writer fields are server-owned.
- Runtime: existing profile/prompt/lane are reused and replay skips provider work.
- Authority: one current eligible board/trace/binding set, or no board plus a truthful gap blocker.
- Recovery: interruption and concurrent requests converge from persisted owners.
- Boundary: no ValidationCycle, WorkOrder, Experiment Foundation, PAI, Claim, or Dossier effect.
- Release: all focused/full repository and CI gates pass.
