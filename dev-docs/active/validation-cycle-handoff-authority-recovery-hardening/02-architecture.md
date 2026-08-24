# T-143 Architecture

## Context & current state

T-142 remains the only owner-root composition seam from a current EvidenceBoard to the existing `validation-planning` coordinator and T-095 ValidationCycle writer. The post-implementation review found edge-condition defects in that seam; it did not find a need for another endpoint, workflow state table, coordinator lane, prompt/profile, or scientific writer.

## Proposed design

### Components / modules

- Existing shared T-142 request/response contract, with nullable pre-resolution context only.
- Existing `PaperImplementationValidationCycleHandoffService`, hardened in place.
- Existing validation repository interface plus one bounded owner-scoped read method.
- Existing in-memory and Prisma repository implementations.
- Existing coordinator, runtime artifact reader, Trace Kernel, and T-095 writer unchanged as authority owners.

### Interfaces & contracts

- API endpoint: `POST /paper-implementation/validation-cycle-handoffs` remains unchanged.
- Request remains exactly `{ implementation_project_id }`.
- Success response remains unchanged.
- `owner_resolution` blocker responses may set unresolved motive/board context and lineage IDs to `null`, with arrays empty and the supplied project root preserved.
- No persisted schema or new domain entity is added.

### Recovery state

- Coordinator identity remains deterministic from server-owned owner semantics and payloads.
- Recovery compares project, coordinator ID, lane, run/execution mode, model fields, budget, and payloads before advance.
- Nonterminal blocked runs may be advanced by the same owner-root command; terminal failed runs are never advertised as repeatable.
- ValidationCycle discovery is bounded to the current owner and lifecycle set; exact-id recovery remains the write authority.

### Authority gates

- `confirmatory_marker` is a human-review boundary, not a normal cycle-write input.
- Model-proposed technical refs are context hints only unless resolved through an existing server owner; T-143 resolves none, so `iteration_budget_id` stays null.
- Recovered board/binding/cycle traces must be complete and target their exact owner.
- The selected coordinator step and runtime artifact must be unique and match project, run, slot, ref, workflow, ID, and hash.

### Events / jobs

- None. Ordinary validation planning may use the existing LLM coordinator.
- No WorkOrder, Experiment Foundation, PAI, or other paid experiment job is authorized.

### Boundaries & dependency rules

- Allowed dependencies: handoff service to existing owner repositories, coordinator, runtime reader, Trace Kernel, and T-095 writer.
- Forbidden dependencies: direct Prisma from service/route, provider SDK, new lane/profile/prompt, workflow engine, caller-authored lineage, or downstream experiment/result/claim writers.

## Data migration

- Migration steps: none.
- Backward compatibility strategy: success payloads and request stay stable; the response schema only adds legal nulls for an existing but previously unreachable semantic stage.
- Rollout plan: focused tests, full Node 20 verification, commit/push to `main`, and remote CI confirmation.

## Non-functional considerations

- Security/auth/permissions: unchanged; no credential or cost authorization is introduced.
- Performance: bounded owner-scoped cycle query replaces T-142's project-wide scan.
- Observability: existing coordinator step/runtime artifacts remain the diagnostic authority; blocker codes become more precise.

## Open questions

- None. The review findings map to existing contracts and owners without a new top-level product decision.
