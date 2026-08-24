# T-142 Evidence Board to ValidationCycle Semantic Handoff

## Status

- State: in-progress
- Mapping: `M-001 > F-001 > R-013`
- Next step: finish the post-fix full regression, land the implementation, and wait for green CI.

## Goal

Let an LLM start from one existing `ImplementationProject` with a current eligible Evidence Board and create or recover one admitted, trace-complete `ValidationCycle` through one semantic command, without caller-authored technical lineage or internal API choreography.

## Non-goals

- Do not create a second coordinator, runtime lane, validation authority, or workflow state.
- Do not create or admit a ResearchWorkOrder, Experiment Foundation Run, provider Attempt, result, claim, or dossier.
- Do not trigger PAI or request cloud credentials.
- Do not auto-confirm expensive, confirmatory, reproduction, or scope-broadening experiment plans.
- Do not productize T-137's fixed SciFact ValidationCycle content.

## Context

T-141 now creates or recovers the current eligible Evidence Board. The existing `validation-planning` coordinator already runs route architecture, route skeptic review, ValidationCycle planning, and feasibility planning, while T-095 owns ValidationCycle draft/admission. The missing product seam is a server-owned composition from the project owner root to those existing services.

The implementation-readiness review also found five prerequisite issues in the T-141 path: stale motive state was not rejected, EvidenceUnit owner/version identity was not fully checked, CitationCandidate recovery used an unbounded project list, Prisma EvidenceBoard/ValidationCycle unique races were not mapped to recoverable conflicts, and the handoff response schema rejected a legal risk-only board with zero bindings.

## Acceptance criteria

- [x] Request contains only `implementation_project_id`; all downstream ids, refs, hashes, profiles, prompts, budgets, and stage selection are server-owned.
- [x] Current project, admitted primary motive, fresh motive state, eligible current board, bindings, assertions, and trace authority are resolved from persisted owners.
- [x] Existing `validation-planning` coordinator/profile/prompt/runtime is reused; no provider SDK or new LLM config is introduced.
- [x] The coordinator's admitted selected ValidationCycle proposal is mapped conservatively into the existing T-095 writer and admitted with a complete deterministic trace.
- [x] Replay and concurrent requests converge on one CoordinatorRun, one ValidationCycle input snapshot, one ValidationCycle, and one trace.
- [x] Blocked/waiting states expose the first executable semantic action without inventing scientific values.
- [x] No Experiment Foundation, PAI, WorkOrder, provider Attempt, result, claim, or dossier effect occurs.
- [x] T-141 quality findings are fixed with focused regression tests.
- [ ] Contract, service, route, persisted replay, full test/typecheck, Context/API, governance, and CI gates pass.
