# T-140 Implementation Plan

## Phases

1. [x] Define strict contracts and stable recovery identity.
2. [x] Add the versioned LLM proposal profile/prompt and persisted runtime path.
3. [x] Compose proposal into existing CoreMotive, trace, and admission owners with exact-once recovery.
4. [x] Expose the thin semantic command and prove replay/concurrency/T-139 boundary behavior.
5. [x] Update context/governance docs and run full release gates.

## Detailed steps

1. Add `CoreMotiveBootstrapProposal@v1`, request, response, effect, blocker, lineage, and resume-policy schemas in shared contracts.
2. Derive a stable bootstrap key from `implementation_project_id`, accepted `intake_snapshot_hash`, and immutable profile/prompt version.
3. Register one dedicated model profile and one immutable prompt template using the existing LLM registry/calling surface.
4. Persist the validated proposal in existing Paper Implementation runtime authority and recover it before any provider call.
5. Deterministically enforce claim ceiling, prohibited claims, scope, falsification, evaluation, risk, and early-check obligations before writing.
6. Call the existing CoreMotive draft writer with deterministic motive/version/assertion ids and the persisted proposal ref/hash.
7. Ensure one complete trace for the version using owner-state conflict recovery; do not create a parallel trace authority.
8. Admit only the first primary motive through the existing admission owner; reread authority after every write or conflict.
9. Add the route/controller/application-service composition with no direct Prisma or provider dependency.
10. Return the first incomplete semantic step and stable lineage; replay from owner state.
11. Verify T-139 advances from its CoreMotive blocker to its validation-planning blocker and performs no T-140 work itself.

## Phase acceptance

- Contract: exactly one caller field; proposal contains semantics only.
- Runtime: prompt/profile are versioned, provider telemetry records requested/resolved routing, and replay skips the provider.
- Authority: exactly one motive identity/version/assertion set/trace/admission per stable bootstrap key.
- Composition: no coordinator, experiment, PAI, new workflow state, or direct persistence shortcut.
- Recovery: interruption after each persisted effect resumes at the next missing effect.
- Product: route and persisted replay return truthful stage/effects/blocker/lineage/resume policy.
- Release: all focused and full repository gates pass.

## Risks and mitigations

- Risk: deterministic ids collide across changed intake semantics.
  - Mitigation: include the accepted snapshot hash and immutable bootstrap profile version in the key.
- Risk: a duplicate trace is created under concurrency.
  - Mitigation: add an internal ensure/read-conflict-recover seam and a focused concurrent test; do not rely on `.ai/.tmp` or request-local locks.
- Risk: the LLM weakens Topic constraints.
  - Mitigation: proposals omit authority fields and deterministic assembly validates/caps the proposal against the accepted snapshot.
- Risk: runtime persistence requires a schema change.
  - Mitigation: stop and report before widening scope; do not introduce a migration implicitly.
- Risk: the new service becomes a second coordinator.
  - Mitigation: fixed four-effect sequence and an unconditional stop after CoreMotive admission.
