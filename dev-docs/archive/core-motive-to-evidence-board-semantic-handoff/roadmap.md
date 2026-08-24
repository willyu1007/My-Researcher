# T-141 CoreMotive to Evidence Board Semantic Handoff — Roadmap

## Goal

- Compose an admitted T-140 CoreMotive into exactly one current fresh, trace-complete Evidence Board from an existing `ImplementationProject`, then stop at the validation-planning boundary.

## Planning-mode context and merge policy

- Runtime mode signal: Default
- User confirmation: yes; the user approved both design decisions and explicitly requested implementation.
- Host plan artifact paths: none
- Requirements baseline: `dev-docs/active/core-motive-to-evidence-board-semantic-handoff/requirement.md`
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/core-motive-to-evidence-board-semantic-handoff/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage

| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | current conversation and supplied handoff | scope, stop conditions, admission policy, authorization | highest | No unresolved conflict |
| Requirements doc | `requirement.md` | use cases, invariants, acceptance | high | Confirmed baseline |
| T-094/T-114/T-137/T-139/T-140 artifacts | existing task bundles and source | existing owners, runtime seam, blocker evidence | high | Prior authority remains read-only |
| Host plan artifact | none | none | medium | Not present |
| Model inference | N/A | implementation sequencing only | lowest | Must not widen scope |

## Non-goals

- No ValidationCycle, WorkOrder, Experiment Foundation, PAI, result closure, Claim, or Dossier creation.
- No fabricated evidence/binding/trace semantics and no weak or blocked candidate promotion.
- No UI, auth, workflow engine, second authority, caller-authored lineage, or database migration.
- No reopening or mutation of T-136 through T-140.

## Open questions and assumptions

### Open questions

- None requiring user input. Phase 0 has one technical stop condition: generic persisted source lineage must be resolvable without changing scientific authority.

### Assumptions

- Existing literature/intake persistence can resolve curation source packets and technical lineage.
- Existing curation coordinator/runtime persistence is sufficient for replay.
- Deterministic identity plus owner reread can converge board writes without new workflow state.

## Merge decisions and conflict log

| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | T-141 stop point | Broad implementation-to-dossier continuation vs discovered missing-board seam | Stop after eligible Evidence Board; T-142 owns validation planning | User approved revised split | T-142 later |
| C2 | Board admission | Always persist proposals vs scientific readiness truth | Only viable, fresh, challenge-passed bindings may produce an `evidence_ready` board; gap-only output remains a blocker | User approved conservative policy | none |
| C3 | Runtime design | Dedicated new LLM flow vs existing curation lane | Reuse `evidence-board-curation` in `seed_initial_board_candidates` mode | Existing equivalent capability | add no profile/prompt unless proven necessary |
| C4 | Recovery state | New continuation table vs persisted owners | Stable identity and existing coordinator/runtime/board owners | Simpler and avoids second workflow | none |
| C5 | Paid effects | One-command downstream progression vs explicit cost boundary | No Experiment Foundation or PAI effect in T-141 | User handoff governance | none |

## Scope and impact

- Affected areas/modules: shared Paper Implementation contracts, backend owner resolution/composition, existing curation coordinator/runtime seam, board/trace recovery, HTTP composition, focused tests, Context/API docs.
- External interface: new `POST /paper-implementation/evidence-board-handoffs` with only `implementation_project_id` in the request.
- Data/storage impact: reuse existing project/intake/motive/runtime/coordinator/trace/board authority; no planned schema change.
- Backward compatibility: additive endpoint and application service; existing routes and authority remain unchanged.

## Project structure change preview

### Existing areas likely to change

- Modify:
  - `packages/shared/src/research-lifecycle/`
  - `apps/backend/src/services/`
  - `apps/backend/src/routes/` and controller composition
  - `apps/backend/tests/`
  - `docs/context/`
- Delete: none
- Move/Rename: none

### New additions

- New module: thin Evidence Board handoff contract/application service where existing boundaries require it.
- New interface/API: `POST /paper-implementation/evidence-board-handoffs`.
- New profile/prompt: none expected; only permitted if release-check proves the existing curation contract cannot express initial seeding.

## Phases

1. **Source and runtime seam proof**
   - Deliverable: verified generic resolver from owner root to curation source/evidence lineage and a documented reuse path.
   - Acceptance: no fixed T-137 semantics, caller-supplied lineage, schema change, or duplicate runtime is needed.
2. **Owner-root contract and recovery identity**
   - Deliverable: strict request/response contracts plus stable curation/board identity.
   - Acceptance: the request contains only `implementation_project_id`; blockers/effects/lineage/resume are explicit.
3. **Curation and scientific authority composition**
   - Deliverable: existing curation runtime invocation plus conservative deterministic binding/trace/board writes.
   - Acceptance: eligible proposal creates one board; gap/blocked/stale proposal writes none.
4. **Semantic API and exact-once replay**
   - Deliverable: route/controller/service composition and persisted replay/concurrency proof.
   - Acceptance: completed owner state is reused, no duplicate runtime/board authority occurs, and T-139 remains at validation planning.
5. **Closure and release gates**
   - Deliverable: context/OpenAPI/docs/governance updates, full tests/typecheck, commit/push/CI.
   - Acceptance: all repository and CI gates pass; task is done.

## Verification and acceptance criteria

- Typecheck: shared and backend package typechecks on Node 20.
- Automated tests: strict contracts; owner/source resolver; eligible/gap/stale curation; interruption/replay/concurrency; real route integration; T-139 boundary; full shared/backend suites.
- LLM release check: config-key and registry validation; confirm existing profile/prompt reuse, bounded provider calls, telemetry, and no secrets.
- Repository gates: Context/API index, project state, governance lint/sync, docs lint, `git diff --check`.
- Persisted check: start from an eligible T-140-shaped ImplementationProject; first command creates/resumes the board; second command reuses all effects with zero provider/authority writes.
- Acceptance: no request parameter bag, no fabricated evidence, no duplicate authority, no ValidationCycle/PAI, truthful blocker/next action, stable lineage.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Persisted source refs cannot resolve traceable evidence context | medium | high | prove resolver first; stop before writes or authority widening | Phase 0 source-lineage test | remove additive task/API work |
| Curation output overstates evidence | medium | high | conservative mapping and all-core assertion coverage gate | gap/weak/stale/adversarial tests | revert composition |
| Replay repeats provider/coordinator work | medium | high | deterministic run identity and owner-state recovery | interruption/replay counters | revert handoff service |
| Concurrent requests duplicate board/trace | medium | high | deterministic ids, existing constraints, conflict reread | concurrent tests | revert exact-once seam |
| Service becomes a second coordinator | medium | high | fixed composition around existing curation lane and explicit stop before ValidationCycle | architecture review | revert endpoint/service |
| Real verification triggers cost | low | high | stubs and persisted authority replay only; no PAI capability in contract | side-effect counters | abort before external call |

## Rollback strategy

- The feature is additive. Revert T-141 commits to remove the route/service/contracts and any internal recovery hardening.
- Existing ImplementationProject/CoreMotive/Evidence Board owners remain valid; never delete or rewrite persisted scientific authority as rollback.

## To-dos

- [x] Confirm planning-mode fallback and input precedence
- [x] Confirm T-141/T-142 split and conservative admission rule
- [x] Confirm phase ordering, stop condition, acceptance, and rollback
- [x] Prove generic source/runtime seam
- [x] Complete implementation and focused local verification
- [x] Complete full repository verification
- [x] Land commits and record remote CI evidence
