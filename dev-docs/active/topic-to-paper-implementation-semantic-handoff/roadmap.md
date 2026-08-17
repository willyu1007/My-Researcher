# Topic to Paper Implementation Semantic Handoff — Roadmap

## Goal

- Let an LLM continue from one admitted Topic Selection PaperProjectBridge to a ready Paper Implementation authority root with one semantic command and no caller-authored hashes, generated ids, or scientific values.

## Planning-mode context and merge policy

- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact paths: none
- Requirements baseline: prior user-confirmed project principles, T-137 outcome, and 2026-08-17 functional-first scope correction
- Merge method: set-union
- Conflict precedence: latest user-confirmed instruction over requirement docs over host plan artifact over model inference
- Repository SSOT output: dev-docs/active/topic-to-paper-implementation-semantic-handoff/roadmap.md
- Mode fallback used: no

## Input sources and usage

| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | Current conversation | Goal, simplicity constraints, functional-first correction | highest | Latest instruction explicitly deprioritizes UI/UX. |
| T-137 result | dev-docs/active/promoted-topic-to-scientific-dossier-canary/ | Proven lineage and task boundary | high | Real forward closure exists; its coordinator is task/profile specific. |
| Existing bridge/intake code | Topic bridge service, contracts, and routes | Owner semantics, PaperProject intake, immutable hash | high | Existing writers are sufficient. |
| Existing Paper Implementation code | Intake bootstrap service, contracts, and routes | ImplementationProject idempotency | high | Existing writer is sufficient. |
| Existing feedback evidence | T-082/T-128 docs and backend services/tests | Exclude duplicate feedback work | high | Feedback/recheck already has real-environment evidence. |
| Model inference | N/A | Minimal projection and sequencing only | lowest | No new product facts assumed. |

## Non-goals

- No new workflow engine, stage graph, cross-domain authority, or general-purpose coordinator.
- No desktop UI/UX change.
- No database migration, authentication layer, or extra approval gate.
- No automatic Literature-to-Experiment discovery, coordinator-run creation, PAI execution, tuning, feedback dispatch, or prose generation.
- No reopening or reuse of T-136/T-137 as implementation containers.
- No semantic search or caller-selectable routing/configuration parameters.

## Open questions and assumptions

### Open questions

- None. The latest user instruction resolves the UI-versus-function conflict in favor of the backend semantic handoff.

### Assumptions

- A Topic Selection-issued bridge id is a valid single caller pointer; the caller need not author its hash or any downstream id. Risk: low.
- Existing PaperProject intake and ImplementationProject bootstrap idempotency are sufficient recovery authority; no new checkpoint is needed. Risk: low.
- A verbatim projection of the bridge working-copy payload is clearer and safer than an additional LLM summary. Risk: low.

## Merge decisions and conflict log

| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | Productization depth | A cross-module command could become a generic orchestrator | Compose exactly two existing owner writers and stop at ImplementationProject readiness | Simplicity and controlled-complexity principles | Stop if a new workflow authority appears necessary. |
| C2 | Technical identifiers | Existing writers require bridge id/hash and create downstream ids | Caller supplies only the Topic-owned bridge id; service reads the hash and writers assign downstream ids | Clear assigner and consumer ownership | Keep ids read-only in response lineage. |
| C3 | UI versus function | Earlier acceptance led to UI mock-first planning; latest instruction deprioritizes UI/UX | Latest instruction wins; supersede UI implementation | Explicit conflict precedence | Retain external mock only as non-authoritative history. |
| C4 | Feedback loop | Functional-first could be interpreted as rebuilding downstream recheck | Do not rebuild it; evidence shows closure already exists | Code, test, Prisma, and real-run evidence | Keep T-138 on Topic-to-PI operational seam. |

## Scope and impact

- Affected areas: shared Paper Implementation intake contracts, one backend composition service, controller/routes, app wiring, and focused tests.
- External interfaces: one additive POST /paper-implementation/topic-handoffs endpoint.
- Data/storage impact: none.
- Backward compatibility: current direct Topic intake and Paper Implementation bootstrap APIs remain unchanged.

## Consistency baseline

- [x] Goal aligns with the latest user-confirmed direction.
- [x] Boundaries align with T-137 completion and project simplicity principles.
- [x] Existing feedback/recheck evidence is treated as implemented, not replanned.
- [x] Phase order and acceptance criteria match the smallest functional seam.
- Intentional divergence: the prior UI roadmap is superseded by the latest functional-first direction.

## Project structure preview

### Existing areas likely to change

- packages/shared/src/research-lifecycle/paper-implementation-contracts.ts
- apps/backend/src/controllers/paper-implementation-controller.ts
- apps/backend/src/routes/paper-implementation-routes.ts
- backend app composition/wiring
- focused shared/backend test files

### New additions

- One PaperImplementationTopicHandoffService module.
- One focused service unit test.
- Route coverage extends the existing Paper Implementation integration test where practical.

## Phases

1. Contract and composition
   - Deliverable: one strict request/response and a thin service over two existing owner writers.
   - Acceptance: one bridge id produces or resumes both downstream roots and returns preserved semantic context.
2. REST wiring and focused tests
   - Deliverable: one command route plus create, resume, and failure coverage.
   - Acceptance: strict input, stable response, no duplicate authority, no owner-gate bypass.
3. Persisted-state verification and closure
   - Deliverable: credential-free T-137 replay evidence, typechecks, governance sync, and documentation.
   - Acceptance: existing T-137 ids are reused, counts do not grow, and no provider path is touched.

## Step-by-step plan

### Phase 0 — Functional boundary discovery

- Objective: distinguish missing cross-module composition from already-closed domain paths.
- Deliverables:
  - verify existing PaperProject intake and ImplementationProject bootstrap APIs;
  - verify existing downstream feedback/recheck implementation and real-run evidence;
  - freeze request at one bridge id and response at semantic context plus lineage.
- Verification: source and documentation inspection only; no runtime mutation.
- Rollback: documentation-only scope correction.

### Phase 1 — Semantic handoff command

- Objective: compose existing owner writers without creating a new authority layer.
- Deliverables:
  - strict shared contract;
  - thin backend service;
  - controller and one route;
  - focused unit and integration tests.
- Verification: shared/backend tests and typechecks; exact replay assertions.
- Rollback: remove the additive command surface; preserve any valid owner records it created.

### Phase 2 — Persisted functional acceptance

- Objective: prove the command can resume a real completed lineage without credentials or new effects.
- Deliverables:
  - T-137 bridge smoke readback;
  - before/after identity and count evidence;
  - updated task verification and governance state.
- Verification: same PaperProject and ImplementationProject ids on repeated calls; no new LLM, PAI, scientific, or feedback effects.
- Rollback: remove route/service only; no owner authority deletion.

## Verification and acceptance

- Typechecks:
  - PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/shared typecheck
  - PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck
- Automated tests:
  - focused shared contract schema tests;
  - focused handoff service unit tests;
  - focused Paper Implementation route integration tests;
  - node .ai/scripts/ctl-project-governance.mjs lint --check;
  - git diff --check.
- Persisted checks:
  - call with the existing T-137 bridge and confirm exact PaperProject and ImplementationProject reuse;
  - call again and confirm no new authority;
  - compare response semantics with the bridge working-copy payload.
- Acceptance:
  - caller provides one Topic-owned bridge id and nothing else;
  - every returned value has one existing owner and one explicit LLM/Paper Implementation consumer;
  - no new auth, schema, workflow authority, provider execution, or configurable parameter surface.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Handoff grows into a global router | medium | high | Fix service to two owner calls and one projection | Dependency and API review | Remove additive command |
| Replay duplicates authority | low | high | Reuse idempotent writers and assert ids/counts | Unit, route, and T-137 smoke | Preserve accepted rows and fix composition |
| Semantic response becomes a second authority | medium | medium | Project verbatim bridge fields; no LLM summarization or persistence | Field-by-field tests | Remove derived fields |
| Scope expands into experiment execution | low | high | Treat stages after ImplementationProject readiness as separate actions/tasks | Diff and effect review | Exclude behavior |

## To-dos

- [x] Confirm planning-mode handling and source precedence.
- [x] Record that latest user direction supersedes the UI-first roadmap.
- [x] Confirm existing feedback/recheck is not the missing seam.
- [x] Confirm phase order, acceptance, and rollback.
- [x] Implement Phase 1.
- [x] Complete final verification and close T-138.
