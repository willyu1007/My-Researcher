# Experiment Foundation V1 — Roadmap

## Scope and constraints

### In scope
- Keep the V1 parent/backlog record for explicit future experiment-foundation product slices.
- Preserve the boundary among experiment-foundation, literature, research-argument, and paper-project.
- Open executable expansion as a separate child task rather than hiding it in this parent.

### Out of scope
- No automatic hyperparameter search, self-built training platform, raw data storage in the repository, or unreviewed paper claims.
- No implementation resumes until a concrete follow-up slice is explicitly selected.

### Constraints and dependencies
- T-070 through T-078 and T-090 are archived historical children that closed the minimum V1 chain and its deep validation.
- Historical Requirement provenance: `R-012` (Experiment foundation reusable assets baseline).

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Retain or archive the parent backlog | archive now / retain for explicit future slice | Retain T-043 as planned | decided | User | T-145 migration alignment | The parent remains non-executable until a slice is selected. |
| Next product expansion | typed CRUD / candidate import / tuning / bridge / live cloud | Not selected | open | User | Future explicit request | Kickoff remains pending. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The implemented minimum V1 chain remains represented by current code and archived child outcomes. | The parent could describe stale behavior. | Inspect current code and open a scoped follow-up before implementation. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-070…T-078 | archived children | Minimum asset, recipe, persistence, execution, and desktop chain | Historical provenance only. |
| T-090 | archived validation child | Deep functional validation of the minimum chain | Historical provenance only. |

## Implementation plan

### Phase 1 — Select an explicit follow-up slice
- Outcome: One bounded product outcome is confirmed or the parent is archived.
- Approach: Reconcile current repository reality before reusing historical roadmap assumptions.
- Planned changes:
  1. Confirm the next user-owned product outcome and open a dedicated child task if implementation is authorized.
- Affected boundaries / entry points: Determined by the selected slice; no implementation entry point is active now.
- Dependencies: Explicit user selection and current-code discovery.
- Exit criteria: The child scope, design, verification, and ownership boundary are explicit.
- Verification: New child governance lint plus checks selected by that slice.
- Recovery: Leave T-043 planned and make no product change.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [ ] Decisions: the next experiment-foundation product slice is explicitly selected.
- [x] Design: the stable V1 boundaries and historical child ownership are recorded.
- [x] Route: implementation must move through a dedicated bounded child task.
- [x] Verification: the child will select checks from its actual affected boundaries.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Historical breadth is mistaken for current implementation scope. | Work starts directly from the old concept map. | Require a current-reality audit and dedicated child task. | Stop and leave the parent planned. |

## Phase closeout

- Review: Confirm the selected child does not duplicate retired or already-landed behavior.
- Record update: Update T-043 relationship and next step only after a child is opened.
- Checkpoint: A task-linked child-opening commit or an authorized archive transition.
