# T-141 CoreMotive to Evidence Board Semantic Handoff — Requirements

## Purpose

This document records the user-confirmed boundary for removing the evidence-board blocker after T-140 without absorbing validation planning or creating a second workflow.

## Planning context

- Runtime mode signal: Default
- User confirmation: the user approved the T-141/T-142 split, the conservative board-admission policy, the implementation plan, and explicitly requested implementation.
- Host plan artifact paths: none
- Requirements collection mode: interactive discussion plus repository read-in
- Requirements baseline owner: user

## Core goal

> Let an LLM start from one existing `ImplementationProject` with an admitted first-primary CoreMotive and create or recover one fresh, trace-complete Evidence Board through one semantic command, without caller-authored lineage and without starting validation planning.

## Use cases

### Seed the first Evidence Board

- Actor: an LLM product client
- Trigger: T-140 has admitted a first-primary CoreMotive but no current Evidence Board exists.
- Flow:
  1. Send only `implementation_project_id`.
  2. The server restores the admitted motive/version/assertions and accepted literature/evidence context.
  3. The existing `evidence-board-curation` runtime proposes initial binding and gap candidates.
  4. Deterministic logic accepts only fresh, viable, challenge-passed bindings and creates complete trace plus the board through existing owners.
  5. Return semantic status, effects, blocker/next action, lineage, and resume policy.
- Expected outcome: one current fresh, trace-complete Evidence Board exists, or a truthful evidence-gap blocker is returned with no misleading board authority.
- Acceptance criteria:
  - [x] The caller supplies no motive/version/assertion/evidence ids, hashes, refs, model, stage, or scientific values.
  - [x] The model proposes curation semantics but never writes board, binding, freshness, or trace authority.
  - [x] No ValidationCycle, WorkOrder, experiment, PAI Job, Claim, or Dossier is created.

### Recover after interruption or replay

- Actor: the same client or a replacement LLM session
- Trigger: the command is repeated after success or any persisted intermediate effect.
- Flow: read owner state, reuse completed curation/runtime/trace/board authority, perform only the first incomplete effect, then reread.
- Expected outcome: stable authority and no duplicate provider call, coordinator work, binding, trace, or board.
- Acceptance criteria:
  - [x] Existing current eligible board is returned without a new curation run.
  - [x] Persisted curation output and deterministic writes recover independently.
  - [x] Concurrent requests converge to one board authority in the supported local backend process.

## Boundaries

### In scope (MUST)

- One `POST /paper-implementation/evidence-board-handoffs` command with only `implementation_project_id`.
- Server-side resolution of admitted primary motive/version/assertions and persisted literature/evidence lineage.
- Reuse of the existing `evidence-board-curation` coordinator/runtime in `seed_initial_board_candidates` mode when a board is absent.
- Conservative deterministic admission into the existing Evidence Board writer with complete trace.
- Exact-once recovery from existing owner state, including persisted-state replay and concurrency behavior.
- Contract, service, route integration, runtime-reuse, blocker, and replay verification.

### Out of scope (NOT)

- ValidationCycle planning, WorkOrder creation, Experiment Foundation admission, PAI execution, result closure, Claim, or Dossier work.
- Fabricating evidence, locators, citations, support strength, or scientific interpretation to fill a curation gap.
- Creating an `evidence_ready` board when a core/must-hold assertion lacks a viable fresh support/challenge path.
- Reopening or mutating T-136 through T-140 authority.
- UI/UX, authentication, generalized workflow state, dynamic stage graphs, new provider/profile/prompt without demonstrated need, or a database migration.

## Constraints

### Technical constraints

- Reuse the existing Paper Implementation coordinator/runtime lane and deterministic Evidence Board/Trace owners.
- Derive all technical lineage from persisted server-owned state; reject unresolved evidence lineage instead of asking the caller or model to invent it.
- Persisted completed steps must be recovered before any provider or authority writer call.
- Board creation requires every core/must-hold assertion to have an accepted viable binding, unless an already-persisted accepted-risk authority explicitly satisfies the existing domain contract.
- Use Node 20 and pnpm for authoritative verification.

### Business constraints

- Ordinary LLM curation needs no additional approval.
- T-141 must have no real PAI or paid experiment effect and must not accept credentials/cost authorization.
- No fabricated scientific result, provider evidence, or running credential may be used.

### Dependencies

- T-138 accepted intake/literature semantics and ImplementationProject.
- T-140 admitted first-primary CoreMotive/version/assertions.
- Existing evidence-board curation runtime/coordinator, runtime artifact persistence, Evidence Board writer, and Trace Kernel.
- T-139 stage resolver for downstream-boundary verification.

## Roadmap consistency anchors

- Goal anchor: admitted CoreMotive to one current fresh, trace-complete Evidence Board.
- Boundary anchor: stop before ValidationCycle; no Experiment Foundation or PAI.
- Constraint anchor: existing curation runtime proposes; deterministic existing owners write; gaps remain blockers.
- Phase anchor: source resolution; owner-root contracts; curation composition; authority/replay; full gates.
- Acceptance anchor: one request field, no fabricated bindings, exact-once recovery, and T-139 remains at `VALIDATION_PLANNING_RUN_NOT_STARTED`.

## Open questions

None. Phase 0 proved that accepted `evidence_unit` refs resolve through persisted EvidenceMap records into the runtime's locator/citation/evidence context without changing schema or scientific authority.

## Assumptions

| ID | Assumption | Risk if wrong | Mitigation |
|---|---|---|---|
| A1 | Existing persisted literature/intake owners expose sufficient locator/citation/evidence lineage for generic curation. | The semantic command cannot safely seed candidates. | Prove the resolver path before implementing writes; stop rather than invent lineage or widen authority. |
| A2 | Existing curation runtime artifacts/coordinator state can be recovered without a new continuation table. | Replay could repeat an LLM call. | Use deterministic run/request identity and owner-state reread; add interruption/replay tests. |
| A3 | Existing Trace Kernel and board writer can converge deterministic board/binding ids. | Concurrency could duplicate board authority. | Reuse writer constraints, add conflict reread/ensure only where needed, and test convergence. |

## Success metrics

- Primary metric: an eligible T-140 owner root reaches exactly one current fresh, trace-complete Evidence Board through one semantic request.
- Secondary metrics:
  - replay performs zero provider and authority writes;
  - gap-only or blocked proposals create no misleading board;
  - all focused/full test, typecheck, LLM registry, context, governance, and CI gates pass.

## Input trace and precedence notes

| Source | Path/reference | Imported facts | Notes |
|---|---|---|---|
| User-confirmed requirements | current conversation and supplied handoff | scope, split, admission policy, authorization | Highest precedence |
| T-137 task/script evidence | `dev-docs/active/promoted-topic-to-scientific-dossier-canary` | real missing-board blocker and fixed-script limitation | Evidence only; do not copy fixed science |
| T-139/T-140 artifacts | existing task bundles and source | owner root, motive authority, and downstream boundary | Existing authority |
| T-094/T-114 implementation | board writer and coordinator/runtime source | reusable deterministic and LLM seams | Existing product services |

## Confirmation

- [x] Core goal confirmed with the user
- [x] T-141/T-142 split and conservative board policy confirmed
- [x] Boundaries explicitly stated
- [x] No unresolved product decision remains before execution
- [x] Ready to proceed to implementation
