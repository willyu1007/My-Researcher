# 01 Plan

## Phases
1. Produce distinct static HTML interaction mocks outside the repository and wait for user selection.
2. Implement one typed App-level bridge handoff using existing desktop composition and backend APIs.
3. Verify existing-project, bootstrap, retry, repeated-click, and terminal-Dossier behavior.

## Detailed steps
1. Confirm the smallest handoff value required by the current Topic and Paper Implementation surfaces.
2. Create multiple static HTML options under a dedicated Desktop directory; do not edit real components yet.
3. After selection, pass the owner-issued bridge context from Topic Workbench to App and Paper Module.
4. Let Paper Implementation look up the existing project by bridge and adopt its read model.
5. If the owner reports no project, call the existing idempotent bootstrap using the bridge's owner-issued hash.
6. Make technical ids read-only context on the normal path; retain diagnostics only where they remain useful.
7. Present loading, one retry action, and terminal Claim/Dossier state without adding a workflow status model.
8. Add focused tests and run the scoped verification gates.

## Phase acceptance
- Static mocks: materially distinct options cover the same bounded interaction and live outside the repository.
- Handoff: one click reaches the correct project context without copying technical values.
- Recovery: repeated actions do not duplicate the project; failures preserve the bridge and expose one retry.
- Terminal state: an existing `ready_for_writing` Dossier is visible after load.
- Scope: no schema/API/auth/provider/workflow expansion.

## Risks & mitigations
- Risk: App-level context becomes a general router.
  - Mitigation: one typed bridge handoff only; no route registry or generic payload.
- Risk: bootstrap runs when a project already exists.
  - Mitigation: lookup first and test the existing/missing split plus repeated click.
- Risk: the UI hides technical fields but leaves the flow unclear.
  - Mitigation: static mocks must show source Topic, destination context, progress, and terminal state.
- Risk: work expands into experiment execution or prose generation.
  - Mitigation: stop and create a separate task if those capabilities are requested.
