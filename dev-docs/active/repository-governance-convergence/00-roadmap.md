# Repository Governance Convergence — Roadmap

## Scope and constraints

### In scope
- Replace the old seven-file/YAML task contract with the fixed new task-bundle and project-hub contract.
- Preserve task IDs and the exact M-000/M-001 and F-000/F-001/F-002 graph while archiving all old completed work.
- Remove repository-local skills and old governance mechanisms; reduce `.ai/` to project-hub governance only.
- Remove UI governance scaffolding while preserving the loaded runtime CSS boundary.
- Reconcile CI, hooks, package entrypoints, and maintained documentation with the supported final surface.

### Out of scope
- No product feature, API, database-schema, LLM behavior, or visual redesign.
- No conversion of the 13 retired Requirement objects into Features.
- No archival of T-043 or T-129.

### Constraints and dependencies
- Live fixtures and contracts must move before archive compression.
- Fixed governance assets come only from `AI-Related-Auxiliary/system/resources/task-governance`.
- The cutover must finish without a committed mixed old/new authority.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Completed active tasks | leave misplaced / archive all | Archive all effective done bundles | decided | User | T-145 alignment | 55 bundles moved before conversion. |
| Project graph | redesign / preserve | Preserve exact M/F graph | decided | User | T-145 alignment | Requirements remain provenance only. |
| Repository-local skills | retain compatibility / remove | Remove all local skill trees | decided | User | T-145 alignment | Supported tools must live with their owning module or retire. |
| UI | refactor now / governance-only cleanup | Preserve runtime CSS; defer redesign | decided | User | T-145 alignment | No visual refactor in this task. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| T-132 landing/gate scripts and similar `.ai` harnesses are historical task mechanisms, not current product authority. | Removing them could delete a supported operator path. | Compare package/docs/CI consumers and retain only independently supported module-owned entrypoints. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-043 | retained active task | Experiment-foundation parent backlog | Preserve ID, planned state, F-001 mapping. |
| T-129 | retained active task | Externally gated topic-selection tail | Preserve ID, planned state, F-001 mapping. |

## Implementation plan

### Phase 1 — Complete the governance cutover
- Outcome: Every task bundle and the project hub validate under the new fixed contract with the old graph preserved.
- Approach: Convert metadata and active documents; compress archives only after live dependency relocation; regenerate projections from the new authority.
- Planned changes:
  1. Convert 142 archived and three active bundles, then project them into `registry.json`.
  2. Compare IDs, active states, and the M/F graph to the old-contract checkpoint.
- Affected boundaries / entry points: `dev-docs/**`, `.ai/project/**`, `.ai/scripts/ctl-project-governance.mjs`.
- Dependencies: Completed live-asset relocation and fixed-asset refresh.
- Exit criteria: New governance lint passes and graph equality is proven.
- Verification: New lint/query/project-query plus normalized pre/post comparisons.
- Recovery: Return to commit `5cf904fb` for a complete old-contract state after lifecycle normalization.

### Phase 2 — Remove old integrations and UI governance scaffolding
- Outcome: `.ai`, CI, hooks, package scripts, maintained docs, and UI expose only supported current interfaces.
- Approach: Retire task-specific mechanisms; relocate only independently supported runtime tools; preserve runtime CSS imports/selectors.
- Planned changes:
  1. Remove non-hub `.ai` content and stale entrypoints.
  2. Remove UI governance-only assets and update supported documentation and hooks.
- Affected boundaries / entry points: `.ai/**`, `package.json`, `ci/**`, `.githooks/**`, root/docs guidance, `ui/**`.
- Dependencies: Phase 1 project/task authority.
- Exit criteria: Reference scans are clean and backend/desktop checks pass.
- Verification: Governance lint, typechecks, focused tests, hook/docs/reference checks.
- Recovery: Restore the last verified cutover checkpoint and reclassify any disputed consumer.

### Phase 3 — Verify semantic convergence and close
- Outcome: Repository reality, supported commands, task record, and project hub agree with no unintended dual track.
- Approach: Full scoped review and decisive verification; archive T-145 only after completion contract holds.
- Planned changes:
  1. Reconcile residual findings and synchronize the final task/hub state.
- Affected boundaries / entry points: All migration-touched governance and integration surfaces.
- Dependencies: Phases 1 and 2.
- Exit criteria: No material defect or stale authority remains; T-145 is archived under the new contract.
- Verification: New strict lint, project/status queries, typechecks, focused tests, and final diff review.
- Recovery: Keep T-145 active until every completion claim is evidenced.

## Kickoff gate

- Status: ready
- [x] Decisions: all user-owned migration choices are decided.
- [x] Design: fixed-asset contract, graph preservation, archive, `.ai`, and UI boundaries are settled.
- [x] Route: live relocation, lifecycle normalization, bounded cutover, cleanup, and verification are executable.
- [x] Verification: graph, governance, reference, runtime, and residue checks are identified.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Graph or task identity drifts in conversion. | Normalized pre/post mismatch or lint error. | Preserve IDs and project objects mechanically. | Restore `5cf904fb` and rerun converter. |
| A historical mechanism is still operationally required. | Supported code/CI/docs consumer remains. | Relocate only proven live capability before deletion. | Restore disputed file and classify its owner. |
| Runtime UI styling is removed with governance assets. | CSS entry/import/selector or desktop typecheck failure. | Preserve `ui/styles/ui.css`, tokens, contract, and desktop-runtime. | Restore UI boundary checkpoint. |

## Phase closeout

- Review: Review each destructive phase for scope, consumers, and exact task identity/graph preservation.
- Record update: Synchronize T-145 and the hub after each decisive phase.
- Checkpoint: Land verified task-linked commits only; never commit the transient mixed-contract window.

## Phase outcomes

- Phase 1 complete: 142 archived bundles and three active bundles validate under the fixed contract; normalized graph and task projections match the old-contract checkpoint.
- Phase 2 complete: `.ai` is project-hub-only, supported validation tools are module-owned, local skills and UI governance scaffolding are removed, and maintained integrations reference only the supported surface.
- Phase 3 complete: typechecks, focused runtime checks, governance queries, residue scans, hook syntax checks, and the full scoped diff review pass. T-145 is ready for archive transition after the cutover commit.
