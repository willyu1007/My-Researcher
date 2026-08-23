# T-141 Implementation Notes

## Status

- Current status: `in-progress`
- Last updated: 2026-08-24

## Decision Gate

- Result: `NEW_TASK`
- Reason: the change crosses shared contracts, LLM runtime/coordinator composition, scientific board/trace authority, REST integration, and persisted replay; it exceeds the non-trivial task threshold.
- Project mapping: `M-001 > F-001 > R-013 > T-141`.
- Prior tasks remain closed: T-136, T-137, T-138, T-139, and T-140 are dependencies/evidence only.

## Readiness decisions

- Split T-141 from T-142: T-141 stops at an eligible Evidence Board; validation planning is a later semantic continuation.
- Reuse the existing `evidence-board-curation` runtime instead of introducing another LLM flow.
- Create an eligible board only when every core/must-hold assertion has a fresh, viable, challenge-passed traceable path. Gap-only output remains a blocker.
- Resolve all technical lineage server-side from persisted owners. A missing generic resolver is addressed only if it is a thin read-only seam; scientific authority/schema expansion is a stop condition.

## Implementation log

- 2026-08-23: baseline confirmed clean at local/remote `8665e17a1cd32dab44e947add7e0463aeaecd846`; governance lint passed and T-141 was unallocated.
- 2026-08-23: task package created before source changes as required by the Decision Gate.
- 2026-08-23: Phase 0 proved the accepted intake `evidence_unit` refs resolve through persisted EvidenceMap records into reviewed source statements, literature refs, locators, hashes, and context packets; no schema or fixed-science mapping is required.
- 2026-08-23: added a narrow Trace Kernel projection that can create/recover a `reviewed` CitationCandidate only from a current upstream `machine_checked` or `human_reviewed` EvidenceUnit. Public candidate creation remains unchanged.
- 2026-08-23: implemented the owner-root handoff service, deterministic curation/coordinator identity, conservative candidate gate, existing Trace/Board writer composition, conflict reread, and process-local singleflight.
- 2026-08-23: completed contract/controller/route/app wiring for `POST /paper-implementation/evidence-board-handoffs` and synchronized OpenAPI/API index/Context checksums.
- 2026-08-23: focused tests proved first creation, exact owner replay, concurrent convergence, interrupted board-write recovery from the persisted curation artifact, stale-source fail-closed behavior, gap-only no-board behavior, route status mapping, and the unchanged T-139 validation-planning blocker.
- 2026-08-24: release review moved singleflight state from module scope to the service instance, preventing separate app compositions from sharing an in-flight response for the same project id.
- 2026-08-24: release review added the assertion `minimum_support_level` to final deterministic admission; a curation candidate below the required level now returns an evidence-gap blocker and writes no board.
- 2026-08-24: all Node 20 focused/full tests, shared/backend typechecks, LLM registry checks, Context/API, project-state, governance strict lint, task-doc strict lint, and diff checks passed locally.

## Parameter ownership

- Caller assigns: `implementation_project_id` only.
- Persisted owners assign: intake/motive/version/assertion/evidence/locator refs and source hashes.
- Server assigns: citation, trace, coordinator, binding, and board identities; lane/mode/profile/prompt/budget; runtime request hashes; effect/recovery projection.
- Existing curation LLM assigns proposals only: role, scope, strength, interpretation, challenge assessment, and gaps.
- Existing deterministic writers consume accepted proposals and own CitationCandidate, TraceManifest, EvidenceBinding, and Evidence Board authority.

## Runtime and side-effect boundary

- Reused lane/profile/prompt: `evidence-board-curation`, `seed_initial_board_candidates`, and the existing registered curation profile/template.
- First eligible owner may invoke one ordinary provider-LLM curation step; replay and interrupted post-curation recovery invoke zero additional provider calls.
- No ValidationCycle, WorkOrder, Experiment Foundation Run, PAI Job, Result, Claim, or Dossier dependency exists in the service.
- Verification uses deterministic test doubles and existing local authority only; no cloud credential or paid execution is involved.

## Known follow-up

- T-142 candidate: Evidence Board to ValidationCycle semantic continuation, reusing the existing validation-planning lane and stopping before any paid Experiment Foundation execution.
