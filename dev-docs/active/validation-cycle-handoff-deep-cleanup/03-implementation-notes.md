# T-144 Implementation Notes

## Status

- Current status: `in-progress`
- Last updated: 2026-08-24

## What changed

- Created T-144 after a scoped architecture review of the T-142/T-143 handoff.
- Added an Ajv type guard against the canonical ValidationCycle planning artifact schema before the service reads recovered persisted JSON.
- Mapped hash-consistent malformed payloads to the existing `409 VERSION_CONFLICT` boundary before any TraceManifest or ValidationCycle authority write.
- Replaced the partial handoff runtime fixture with the existing complete envelope builder and a schema-valid two-candidate planning artifact.
- Split envelope construction options from admission seeding options so tests no longer need a fake admission service to build a complete artifact.
- Extracted deterministic coordinator, cycle, trace, functional-ref, identifier, and schema rules into a private pure authority module; the existing service remains the only orchestrator and writer composition seam.

## Files/modules touched (high level)

- ValidationCycle handoff service and private authority helpers.
- Handoff service tests and complete runtime-envelope fixture builder.
- T-144 governance and verification documentation.

## Decisions & tradeoffs

- Decision: fix the runtime boundary before structural extraction.
  - Rationale: behavior changes and refactoring remain separately verifiable checkpoints.
  - Alternatives considered: trust the repository TypeScript type or validate only ad hoc fields. Both leave persisted JSON outside runtime type safety.
- Decision: reuse the shared canonical planning artifact schema.
  - Rationale: a second hand-written schema would drift from the runtime producer.
- Decision: extract only pure authority rules.
  - Rationale: orchestration remains obvious in one application service and no second workflow/service authority is introduced.

## Deviations from plan

- None.

## Known issues / follow-ups

- No local implementation issue remains.
- Delivery is pending the T-144 commit, push to `main`, and green GitHub Actions.
- The task bundle remains under `dev-docs/active/` until explicit archival approval; archival is documentation lifecycle work, not unfinished implementation.
- ValidationCycle-to-experiment-specification continuation remains a separate product task and was not pulled into this cleanup.

## Pitfalls / dead ends (do not repeat)

- Keep the detailed log in `05-pitfalls.md` (append-only).
