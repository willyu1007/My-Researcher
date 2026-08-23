# T-140 Topic Semantics to CoreMotive Bootstrap — Roadmap

## Goal

- Compose T-138 topic semantics into exactly one admitted CoreMotive from an existing `ImplementationProject`, then stop at the validation-planning boundary.

## Planning-mode context and merge policy

- Runtime mode signal: Default
- User confirmation: yes; the user explicitly approved the final recommendation and implementation start.
- Host plan artifact paths: none
- Requirements baseline: `dev-docs/active/topic-semantics-to-core-motive-bootstrap/requirement.md`
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/topic-semantics-to-core-motive-bootstrap/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage

| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | current conversation and supplied handoff | scope, stop conditions, authorization | highest | No unresolved conflict |
| Requirements doc | `requirement.md` | use cases, invariants, acceptance | high | Confirmed baseline |
| T-138/T-139 artifacts | existing task bundles and source | owner roots and downstream stage truth | high | Read-only prior authority |
| Host plan artifact | none | none | medium | Not present |
| Model inference | N/A | implementation sequencing only | lowest | Must not widen scope |

## Non-goals

- No coordinator run, ValidationCycle, WorkOrder, experiment, PAI, evidence closure, Claim, or Dossier creation.
- No UI, auth, workflow engine, second authority, or caller-authored technical lineage.
- No mutation or reopening of T-136 through T-139.
- No database migration unless an invariant cannot be met with existing owners; that discovery is a stop-and-report condition.

## Open questions and assumptions

### Open questions

- None before execution.

### Assumptions

- Existing runtime-artifact persistence is sufficient for proposal recovery.
- Deterministic ids plus owner-state reread can converge concurrent requests without a new workflow row.
- A credential-free persisted-state fixture or T-138 owner can prove replay; no PAI replay is required.

## Merge decisions and conflict log

| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | T-140 stop point | Initial broad continuation idea vs readiness review | Stop after admitted CoreMotive; T-141 may later own validation planning | User approved revised plan | none |
| C2 | Semantic authority | Direct mapping alone vs LLM-generated rich motive fields | Dedicated versioned LLM proposal, deterministic authority writer | T-138 fields do not satisfy CoreMotive contract | none |
| C3 | Recovery state | New continuation table vs existing owner state | Stable identity and persisted existing owners | Simpler and avoids second workflow | none |
| C4 | Paid effects | One-click progression vs explicit cost boundary | No PAI or coordinator side effect in T-140 | User handoff governance | none |

## Scope and impact

- Affected areas/modules: shared research-lifecycle contracts, LLM registries/prompts, backend Paper Implementation services, HTTP composition, focused tests, Context/API docs.
- External interface: new `POST /paper-implementation/core-motive-handoffs` with only `implementation_project_id` in the request.
- Data/storage impact: reuse existing intake, runtime artifact, CoreMotive, assertion, trace, and portfolio authority; no planned schema change.
- Backward compatibility: additive endpoint and profile/prompt; existing endpoints and owners remain unchanged.

## Project structure change preview

### Existing areas likely to change

- Modify:
  - `packages/shared/src/research-lifecycle/`
  - `.ai/llm-config/registry/`
  - `apps/backend/src/services/`
  - `apps/backend/src/routes/` and controller composition
  - `apps/backend/tests/`
  - `docs/context/`
- Delete: none
- Move/Rename: none

### New additions

- New modules: CoreMotive bootstrap proposal contract/runtime and thin handoff service.
- New interface/API: `POST /paper-implementation/core-motive-handoffs`.
- New files: only where existing module boundaries require them.

## Phases

1. **Contract and recovery identity**
   - Deliverable: strict shared request/response/proposal contracts and stable bootstrap identity.
   - Acceptance: caller owns only `implementation_project_id`; deterministic identity is test-covered.
2. **Versioned LLM proposal runtime**
   - Deliverable: registered profile/prompt and persisted proposal invocation through the existing gateway.
   - Acceptance: valid proposal persists once; replay does not call the provider; malformed output blocks before authority writes.
3. **Scientific authority composition**
   - Deliverable: deterministic assembly, existing CoreMotive writer, exact-once trace ensure, and first-primary admission.
   - Acceptance: interruptions at proposal/draft/trace/admission recover with one authority chain.
4. **Semantic API and product replay**
   - Deliverable: thin route/controller/service response plus T-139 downstream-boundary proof.
   - Acceptance: contract/service/route/replay/concurrency tests pass; no coordinator or PAI effect occurs.
5. **Closure and release gates**
   - Deliverable: context/OpenAPI/docs/governance updates, full test/typecheck evidence, commit/push/CI.
   - Acceptance: all repository gates and CI pass; task is archived as done.

## Verification and acceptance criteria

- Typecheck: shared and backend package typechecks on Node 20.
- Automated tests: proposal contract, deterministic assembler, service interruptions/replay/concurrency, HTTP integration, T-139 boundary regression, full shared/backend suites.
- Registry/config: LLM registry validator and config-key check.
- Repository gates: Context/API index, project state, governance lint/sync, docs lint, `git diff --check`.
- Manual/persisted check: start from an existing T-138 ImplementationProject; first command creates or resumes admitted CoreMotive; second command reports reuse and zero provider/authority effects.
- Acceptance: no request technical parameter bag, no duplicate authority, no coordinator/PAI, truthful blocker/next action, stable lineage.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Provider output cannot satisfy scientific contract | medium | high | Strict proposal schema plus deterministic owner constraints | malformed-output tests | remove additive endpoint/profile |
| Concurrent requests create duplicate motive/trace | medium | high | deterministic ids, conflict reread, conditional admission hardening | concurrent service/integration tests | revert exact-once changes |
| Existing runtime artifact cannot key proposal recovery | low | high | discovery before code path commitment; no schema fallback without report | focused repository inspection | stop before schema change |
| Service grows into a workflow engine | medium | high | fixed ordered composition and explicit stop after admission | architecture review and no coordinator dependency | revert endpoint/service |
| Real verification triggers cost | low | high | credential-free mocks and owner replay only; no PAI capability in contract | side-effect counters | abort before external call |

## Rollback strategy

- The feature is additive. Revert the T-140 commit(s) to remove the route, service, contracts, and registry entries.
- Existing ImplementationProject/CoreMotive owners remain valid because no migration or changed authority semantics are planned.
- Never delete or rewrite persisted scientific authority as rollback.

## Optional detailed documentation layout

```
dev-docs/active/topic-semantics-to-core-motive-bootstrap/
  requirement.md
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos

- [x] Confirm planning-mode fallback and input precedence
- [x] Confirm user-approved boundary and phase ordering
- [x] Confirm acceptance and rollback strategy
- [x] Complete implementation and local repository verification
- [ ] Land commits and record remote CI evidence
