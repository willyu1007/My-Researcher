# T-140 Topic Semantics to CoreMotive Bootstrap — Requirements

## Purpose

This document records the user-confirmed boundary for removing the first general-product blocker after T-138 without creating a second workflow or weakening scientific authority.

## Planning context

- Runtime mode signal: Default
- User confirmation: the user approved both design decisions, approved the final plan, requested an implementation-readiness review, and then explicitly authorized implementation.
- Host plan artifact paths: none
- Requirements collection mode: interactive discussion plus the supplied next-stage handoff
- Requirements baseline owner: user

## Core goal

> Let an LLM start from one existing `ImplementationProject` and create or recover the first admitted `CoreMotive` through one semantic command, without caller-authored technical lineage and without starting validation planning.

## Use cases

### Bootstrap a bare T-138 project

- Actor: an LLM product client
- Trigger: an existing `ImplementationProject` has no CoreMotive authority.
- Flow:
  1. Send only `implementation_project_id`.
  2. The server restores the accepted intake snapshot and its semantic payload.
  3. The server obtains a versioned LLM proposal only when no persisted proposal exists.
  4. Deterministic application logic creates the CoreMotive draft, ensures complete trace, and admits the first primary motive.
  5. Return semantic status, effects, blocker/next action, lineage, and resume policy.
- Expected outcome: one admitted CoreMotive exists and T-139 can truthfully report the validation-planning boundary.
- Acceptance criteria:
  - [ ] The caller supplies no motive/version/assertion ids, hashes, refs, stage, model, or scientific values.
  - [ ] The model proposes scientific semantics but never writes scientific authority.
  - [ ] No coordinator run, experiment, PAI Job, Claim, or Dossier is created.

### Recover after interruption or replay

- Actor: the same client or a replacement LLM session
- Trigger: the command is repeated after success or any persisted intermediate effect.
- Flow: read owner state, reuse the proposal and completed authority, perform only the first incomplete deterministic effect, then reread.
- Expected outcome: stable ids and one admitted primary motive, with no duplicate LLM call or authority.
- Acceptance criteria:
  - [ ] Identity is stable for `(implementation_project_id, intake_snapshot_hash, bootstrap_profile_version)`.
  - [ ] Persisted proposal, CoreMotive, trace, and admission are reused independently.
  - [ ] Concurrent requests converge or return a retryable conflict; they never create two primary motives.

## Boundaries

### In scope (MUST)

- One `POST /paper-implementation/core-motive-handoffs` command.
- A dedicated, versioned `CoreMotiveBootstrapProposal@v1` LLM contract, prompt, and routing profile.
- Deterministic proposal validation/assembly into the existing CoreMotive writer.
- Exact-once recovery from persisted Paper Implementation owner state.
- Complete CoreMotive trace and first-primary admission using existing scientific authority services.
- Contract, service, route integration, persisted-state replay, and concurrency-focused verification.

### Out of scope (NOT)

- Creating or advancing a Paper Implementation coordinator run.
- ValidationCycle planning, WorkOrder creation, Experiment Foundation admission, PAI execution, evidence closure, Claim, or Dossier work.
- Changing T-136, T-137, T-138, or T-139 authority.
- UI/UX, authentication, generalized workflow state, dynamic stage graphs, or a database migration unless implementation proves an unavoidable invariant gap.
- Asking the LLM or caller to generate or echo authority ids, hashes, refs, or admission status.

## Constraints

### Technical constraints

- Reuse the existing single LLM calling surface and registry-first profile/prompt configuration.
- Reuse Paper Implementation intake, CoreMotive, trace, and admission owners; do not write Prisma from the application service.
- Prefer deterministic ids and existing owner state over a new continuation table.
- Preserve the T-138 problem, contribution, evaluation plan, claim ceiling, prohibited claims, conditions, risks, and early-check obligations.
- Use Node 20 and pnpm for the full verification baseline.

### Business constraints

- Ordinary LLM proposal generation needs no extra approval.
- No real PAI job or paid experiment side effect is permitted in T-140.
- No fabricated provider evidence, scientific result, or credential may be used.

### Dependencies

- T-138 accepted intake snapshot and `ImplementationProject` persistence.
- Existing CoreMotive draft/admit and TraceManifest services.
- Existing LLM registry, gateway, runtime-artifact persistence, and test doubles.
- T-139 stage resolver for downstream boundary verification.

## Roadmap consistency anchors

- Goal anchor: bare T-138 owner root to one admitted CoreMotive.
- Boundary anchor: stop before coordinator/validation planning; no PAI.
- Constraint anchor: LLM proposal only, deterministic writer authority, owner-state replay.
- Phase anchor: contract and identity; proposal runtime; authority composition; API/replay; full gates.
- Acceptance anchor: one request field, exact-once recovery, no duplicate authority/LLM call, T-139 reaches its next truthful blocker.

## Open questions

None. The implementation-readiness review resolved the four blocking design choices before execution.

## Assumptions

| ID | Assumption | Risk if wrong | Mitigation |
|---|---|---|---|
| A1 | Existing runtime-artifact storage can persist and recover the proposal without a schema migration. | A new table would broaden scope. | Prove this during Phase 1; stop and report before any schema change. |
| A2 | Existing CoreMotive and trace services can be hardened internally for exact-once convergence. | Concurrency could duplicate identity or trace rows. | Add deterministic identity plus conflict recovery and focused concurrent tests. |
| A3 | A real persisted bare T-138 source can be created credential-free if none exists. | Real-owner replay cannot be demonstrated. | Use T-138’s deterministic handoff only; do not mutate T-137 or invoke PAI. |

## Success metrics

- Primary metric: a bare existing `ImplementationProject` reaches exactly one admitted primary CoreMotive through one semantic request.
- Secondary metrics:
  - replay makes zero LLM/provider and authority writes;
  - all focused and full test/typecheck/governance/context gates pass;
  - T-139 reports `VALIDATION_PLANNING_RUN_NOT_STARTED` for the completed T-140 owner state.

## Input trace and precedence notes

| Source | Path/reference | Imported facts | Notes |
|---|---|---|---|
| User-confirmed requirements | current conversation and supplied handoff | goal, boundaries, authorization, acceptance | Highest precedence |
| T-138 task bundle and implementation | `dev-docs/active/topic-to-paper-implementation-semantic-handoff` | accepted owner root and semantic payload | Existing authority |
| T-139 task bundle and implementation | `dev-docs/active/paper-implementation-to-scientific-dossier-semantic-continuation` | current CoreMotive blocker and downstream boundary | Existing continuation truth |
| Implementation-readiness review | current conversation | stop condition, proposal contract, recovery identity, concurrency requirements | User approved |

## Confirmation

- [x] Core goal confirmed with the user
- [x] Use cases reviewed and agreed
- [x] Boundaries explicitly stated
- [x] No open decision remains before execution
- [x] Ready to proceed to roadmap creation and implementation
