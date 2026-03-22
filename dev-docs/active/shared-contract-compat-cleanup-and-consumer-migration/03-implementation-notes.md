# 03-implementation-notes

## Status
- Current status: `done`
- Last updated: 2026-03-22

## What changed
- Task bundle initialized for compat cleanup and backend consumer migration follow-up to `T-019`.
- Governance sync assigned task ID `T-020` and registered the bundle under `M-000 / F-000`.
- `packages/shared/package.json` gained filename-aligned public `exports` subpaths for all split research-lifecycle contract files.
- `packages/shared/src/research-lifecycle/index.ts` now re-exports split modules directly, and `interface-field-contracts.ts` was removed.
- `apps/backend/src` root imports were migrated to file-named subpaths; `33` files were rewritten, including `5` mixed-domain files that now import from multiple bounded-context subpaths.
- Added backend static boundary test to block repo-internal root imports and updated shared test coverage to validate the clean barrel instead of the compat layer.
- Updated shared package documentation to describe the clean barrel and file-named public subpaths.

## Files/modules touched (high level)
- `packages/shared/`
- `apps/backend/src/`
- `dev-docs/active/shared-contract-compat-cleanup-and-consumer-migration/`

## Decisions & tradeoffs
- Decision:
  - Treat this work as a new task, not a reopen of `T-019`.
  - Rationale:
    - `T-019` explicitly deferred compat cleanup and consumer migration.
- Decision:
  - Use filename-aligned public subpaths rather than short aliases.
  - Rationale:
    - Minimizes naming churn and enables direct codemod from current split files.
- Decision:
  - Keep shared root entry as external compatibility alias, but forbid backend repo-internal usage.
  - Rationale:
    - Allows safe migration without hard-breaking package consumers outside this repo.
- Decision:
  - Let governance sync generate `.ai-task.yaml`.
  - Rationale:
    - Avoids task ID drift against registry.
- Decision:
  - Keep `@paper-engineering-assistant/shared` as a package-level compatibility alias while enforcing repo-internal backend migration.
  - Rationale:
    - Preserves safe external compatibility without leaving backend on the legacy root surface.

## Deviations from plan
- None yet.

## Known issues / follow-ups
- Root alias remains intentionally available for non-backend consumers; if future repo modules start consuming shared contracts, they should use file-named subpaths directly.
- Archival was not performed because archive moves require separate approval.

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
