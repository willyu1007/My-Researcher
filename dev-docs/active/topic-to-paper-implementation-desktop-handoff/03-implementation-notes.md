# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-08-17

## What changed
- Created T-138 as a new explicit follow-up after T-137 proved the real backend scientific-dossier path.
- Scoped the task to one desktop handoff that removes manual bridge/id/hash copying.
- Created one self-contained comparison document with three working interaction variants:
  - A — direct continuation with a compact destination context notice;
  - B — a persistent read-only research lineage strip;
  - C — a split semantic-context and Paper Implementation workspace.
- Each variant demonstrates existing-project lookup, first bootstrap, failure/retry, and terminal `ready_for_writing` state.
- No application code, API, database, provider, or runtime configuration has changed.

## Files/modules touched
- `dev-docs/active/topic-to-paper-implementation-desktop-handoff/`
- `.ai/project/main/` after governance registration and mapping.
- External presentation artifact: `/Users/yurui/Desktop/My-Researcher-T138-UI-Mocks/t138-handoff-options.html`.

## Decisions & tradeoffs
- Decision: use a new T-138 task rather than reopen T-137 or extend T-043.
  - Rationale: T-137 is complete and T-043 is an umbrella, while the desktop product gap is a distinct accepted follow-up.
  - Alternatives considered: extending the canary scripts; rejected because another script would not improve normal user flow.
- Decision: reuse existing lookup/bootstrap/read-model APIs.
  - Rationale: backend authority is already implemented and proven; the missing behavior is UI composition.
  - Alternatives considered: a new cross-module continuation endpoint; rejected as unnecessary workflow machinery.
- Decision: static HTML mocks precede component changes.
  - Rationale: required for non-trivial UI work and keeps visual choices separate from implementation.

## Deviations from plan
- None.

## Known issues / follow-ups
- Current pause: wait for the user to select A, B, or C.
- After selection, translate only the chosen interaction into the existing App/Topic/Paper composition.
- Add focused controller/component tests, then run desktop typecheck and UI governance gates.
- Do not start component implementation before the mock selection.

## Pitfalls / dead ends
- Keep the detailed append-only record in `05-pitfalls.md`.
