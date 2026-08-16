# T-138 Topic to Paper Implementation Desktop Handoff

## Status
- State: in-progress
- Next step: user selects static mock A, B, or C from `/Users/yurui/Desktop/My-Researcher-T138-UI-Mocks/t138-handoff-options.html`; do not edit production components before that selection.

## Goal
Let a user continue from an admitted Topic Selection `PaperProjectBridge` into the correct Paper Implementation context with one action and no manual technical-id or hash copying.

## Non-goals
- Do not add a workflow engine, generic coordinator, database migration, new public API, or new authority.
- Do not add authentication, approval, validation, or configuration layers beyond existing product behavior.
- Do not execute PAI Jobs, invoke new LLM work, generate prose, or reopen T-136/T-137.
- Do not redesign the broader desktop shell, Topic Workbench, or Paper Implementation Workbench.

## Context
- T-137 proved a fresh, semantically continuous backend path from literature-backed Topic through real scientific evidence to a trace-complete `ready_for_writing` Dossier.
- The desktop Topic Workbench can create `PaperProjectBridge` and `PaperProjectIntake`, but its terminal message only tells the user to visit the paper module.
- The Paper Implementation Workbench still presents editable `ImplementationProject ID`, `PaperProjectBridge ID`, and `bridge_payload_hash` fields.
- Existing backend calls already support lookup by bridge, idempotent bootstrap, and loading the complete Paper Implementation read model. The product gap is a small desktop handoff, not missing domain authority.

## Design alignment
- **Simplification:** one semantic “continue” action replaces copy/paste and a three-field technical form on the normal path.
- **Robustness:** lookup existing project first, bootstrap only when absent, and expose one retry on failure.
- **Clarity:** the UI carries a bridge context; server/repository owners continue assigning ids, hashes, and status.
- **Controlled complexity:** no new schema/API/router/workflow abstraction and no generic parameter bag.
- **Continuity:** Topic intent and bridge context flow directly into Paper Implementation; the terminal Claim/Dossier remains visible as the outcome.

## Acceptance criteria
- [ ] After a `PaperProjectIntake` exists, Topic Workbench offers one clear action to continue to Paper Implementation.
- [ ] The action opens `论文管理 > 论文实施` with the matching bridge context already applied.
- [ ] An existing ImplementationProject loads without mutation; an absent project uses the existing idempotent bootstrap path.
- [ ] Normal use requires no copying or authoring of bridge id, payload hash, ImplementationProject id, or scientific value.
- [ ] Loading, failure/retry, and `ready_for_writing` Dossier states are clear and focused.
- [ ] No new database model, public API, auth/approval gate, workflow authority, PAI Job, or LLM call is introduced.
- [ ] Focused UI/controller tests, desktop typecheck, UI governance checks, project governance lint, and manual smoke pass.
