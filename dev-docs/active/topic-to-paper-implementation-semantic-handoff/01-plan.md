# 01 Plan

## Phases

1. [x] Verify that downstream feedback/recheck is already connected and is not the T-138 gap.
2. [x] Replace the UI-first task scope with a backend semantic-handoff scope.
3. [x] Implement the shared request/response contract, thin composition service, controller, and one route.
4. [x] Verify create, resume, replay, and owner-gate failure behavior, including read-only reuse of the T-137 lineage.

## Detailed steps

1. Add a strict request with one caller field: paper_project_bridge_id.
2. Read the bridge handoff from the existing Topic Selection owner.
3. Call the existing idempotent PaperProject intake writer with the owner-issued bridge hash and workspace.
4. Call the existing idempotent Paper Implementation bootstrap writer with the same owner-issued values.
5. Build the continuation packet only from the admitted bridge, intake result, and ImplementationProject response.
6. Keep semantic fields unchanged: title, problem statement, contribution summary, evaluation plan, planning notes, claim ceiling, prohibited claims, conditions, accepted risks, and early-check obligations.
7. Return technical ids and refs only in a lineage section; never ask the caller to echo or author them.
8. Add focused contract, service, and route tests for first creation, full replay, and owner-gate failures.
9. Run a credential-free smoke against the existing T-137 bridge and assert zero new PaperProject or ImplementationProject authority.

## Phase acceptance

- Contract: one caller-owned bridge ref; no hash or generated id fields.
- Handoff: the existing PaperProject intake and ImplementationProject bootstrap are composed exactly once.
- Continuity: the packet is sufficient for an LLM to understand what research is being implemented and which boundaries remain binding.
- Recovery: replay returns existing authority and the same semantic context.
- Scope: one new command surface; no UI, schema, auth, provider, or workflow expansion.

## Risks and mitigations

- Risk: the new service becomes a generic cross-module orchestrator.
  - Mitigation: constrain the service to two existing idempotent writes and one response projection; the handoff service cannot start implementation lanes.
- Risk: semantic context drifts while technical refs remain valid.
  - Mitigation: copy all semantics from the current bridge handoff in one response; do not summarize with a new LLM call.
- Risk: a partial PaperProject intake exists when PI bootstrap fails.
  - Mitigation: treat PaperProject intake as valid persisted progress and replay from the accepted intake; do not roll back accepted upstream authority.
- Risk: T-137 is accidentally replayed or mutated during smoke verification.
  - Mitigation: use the already-complete bridge and assert both writers report reuse with unchanged ids and no provider calls.
