# 仓库治理收敛 / Repository governance convergence — Implementation Notes

## Status

- Current status: `in-progress`
- Last updated: 2026-08-24

## Decision Gate

- Result: `NEW_TASK`
- Reason: the approved change is cross-cutting, destructive-adjacent, multi-session governance migration work spanning task records, project hub, skills/tooling, UI governance, CI/hooks/docs, and archives.
- Opening contract: current old seven-file dev-docs contract.
- Initial project placement: reserved inbox `F-000` / `M-000`; no new Milestone, Feature, or Requirement.
- CLI-allocated identity: `T-145`.

## Approved decisions

- Preserve the current Milestone/Feature graph.
- Archive all effective `done` bundles currently left under `active/` at the execution baseline.
- Keep `T-043` and `T-129` active.
- Remove repository-local skill mechanisms.
- Refresh the approved fixed task-governance assets.
- Convert all task bundles and the project hub to the new contract.
- Make `.ai/` project-hub-only.
- Preserve runtime UI CSS while removing UI governance scaffolding.
- Clean CI, hooks, and maintained documentation references.
- Relocate live fixtures/contracts and verify their consumers before archive compression.

## Opening evidence

- Branch reported as `main`; the initial worktree status was clean.
- Duplicate searches for `repository governance` and `governance convergence` returned no tasks.
- Baseline old governance lint passed.
- 2026-08-24 old CLI inventory: 55 `done`, two `planned` (`T-043`, `T-129`), zero `in-progress`, and zero `blocked` tasks.
- The old allocator includes task IDs found in both metadata and registry history, chooses the next unused monotonically increasing ID, and defaults missing task mappings to `F-000` / `M-000`.
- The recent complete old-format reference inspected was `T-141` under `dev-docs/active/core-motive-to-evidence-board-semantic-handoff/`.
- Old CLI dry-run proposed allocation `T-145` plus updates to `registry.yaml`, `dashboard.md`, `feature-map.md`, and `task-index.md`; no other writes were proposed.
- Old CLI apply allocated `T-145`; ID and slug queries both returned one `planned` entry mapped to `F-000` / `M-000`.
- Repository-wide metadata search found exactly one `task_id: T-145` occurrence.
- Final old governance lint passed, and the scoped worktree audit showed only this bundle plus the four CLI-managed hub outputs.

## What changed in this opening

- Created the planned seven-file old-format task bundle only.
- Did not create `.ai-task.yaml`; the old CLI owns task identity allocation.
- Did not implement any migration, removal, move, compression, application, CI, hook, root-doc, skill, or UI change.

## Planning checkpoint

- The opening checkpoint landed as commit `3e0a07fd` with exactly one `Task: T-145` trailer.
- The user had already approved all four top-level migration decisions and authorized the complete implementation boundary.
- The task is now `in-progress`; kickoff is ready, and the first action is the execution-time baseline plus live-dependency relocation.

## Decisions and tradeoffs

- Decision: treat the old contract as authoritative for task creation even though the task targets the new contract.
  - Rationale: the migration has not begun, and allocating identity under an uninstalled contract would invent authority.
  - Alternative rejected: hand-author a future-format bundle or metadata file.
- Decision: sequence live fixture/contract relocation before archive compression.
  - Rationale: historical location is not proof that a file lacks live consumers.
  - Alternative rejected: compress first and repair broken consumers later.
- Decision: keep exact new-contract paths and commands out of the plan until fixed assets are inspected.
  - Rationale: the fixed assets, not inference, define the target contract.

## Deviations from plan

- None.

## Known issues / follow-ups

- Refresh counts and path inventories at kickoff because repository state may change after this opening.
- No planning blocker remains; refresh the execution-time inventory before migration writes.

## Pitfalls / dead ends

- Keep the detailed append-only record in `05-pitfalls.md`.
