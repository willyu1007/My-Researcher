# T-143 ValidationCycle Handoff Authority and Recovery Hardening

## Status

- State: done
- Next step: none within T-143; archive the task bundle only after explicit approval.

## Goal

Make the existing EvidenceBoard-to-ValidationCycle semantic handoff fail closed at human/scientific authority boundaries and make every advertised recovery path truthful, bounded, and deterministic.

## Non-goals

- Do not reopen T-142 or create a second handoff/coordinator/workflow authority.
- Do not change scientific observations, existing admitted ValidationCycles, Claims, or Dossiers.
- Do not create ExperimentPlanLight, WorkOrder, Experiment Foundation Run, PAI Job, or any paid provider side effect.
- Do not add caller-supplied lineage, confirmation, budget, stage, or scientific fields.
- Do not implement the future ValidationCycle-to-experiment-specification continuation.
- Do not add a database migration, UI/UX, auth, multitenancy, or a generalized workflow engine.

## Context

T-142 is green and correctly composes the existing validation-planning coordinator with the T-095 ValidationCycle writer. A post-implementation architecture review found that several edge paths do not meet T-142's own declared boundaries: a confirmatory proposal can reach admission without human review, one model-authored technical budget reference is persisted, blocked coordinator runs cannot resume through the documented replay command, deterministic run recovery checks only part of the run semantics, owner-resolution states cannot be represented by the response contract, cycle discovery scans every project cycle, and durable trace/artifact recovery does not validate all exact target identities.

## Acceptance criteria (high level)

- [x] A selected `confirmatory_marker=true` proposal returns `waiting_for_human_confirmation` before any ValidationCycle or trace write.
- [x] No model-authored technical ID is persisted as ValidationCycle authority; server-owned IDs remain deterministic.
- [x] Deterministic coordinator recovery validates the complete server-owned run request and resumes retryable blocked runs without creating another run.
- [x] Terminal, budget, provider, domain, and owner-state blockers expose truthful status, action, and retryability.
- [x] Missing/ineligible owner state can be expressed at `owner_resolution` without fabricated semantic context or lineage.
- [x] T-142 uses a bounded owner-scoped ValidationCycle lookup for reuse and ambiguity detection.
- [x] Recovered traces, coordinator steps, and runtime artifacts are rejected on exact owner/target/ref/hash drift or ambiguity.
- [x] Focused contract, repository, service, route, replay, full test/typecheck, Context/API, governance, and CI gates pass.
