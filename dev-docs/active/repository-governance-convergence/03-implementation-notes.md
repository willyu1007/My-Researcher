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

- The first focused Node test attempt stopped before assertions because the local install tree lacked declared dependency `ajv`. `pnpm install --frozen-lockfile` restored the lockfile-defined tree without changing dependency metadata.
- The D-19 CLI unit test used a POSIX-only literal repository root. Once assertions ran on Windows, path containment correctly rejected the mismatched root representation. The test now constructs its root and expected output with `node:path`; production containment behavior is unchanged.

## Phase 1 — Live-asset relocation

- Copied the reviewed D-19 source-policy attestation from T-132 historical evidence to the backend-owned fixture directory:
  - old: `dev-docs/archive/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json`
  - new: `apps/backend/src/services/test-fixtures/experiment-foundation-d19-source-policy-attestation.fixture.json`
- Copied the N8 placeholder corpus from T-123 historical evidence to the backend-owned fixture directory:
  - old: `dev-docs/archive/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/corpus-template.json`
  - new: `apps/backend/src/services/test-fixtures/topic-selection-v1b-n8-calibration-corpus-template.fixture.json`
- Copied the still-supported environment controller and its minimal YAML parser from the old skill tree to `env/scripts/`, then repointed root package scripts there.
- Moved volatile output defaults from `.ai/.tmp/**` to the already ignored repository-level `artifacts/**` boundary.
- Added maintained process contracts for N8 calibration and the Topic Workbench, and changed source comments to point at those contracts rather than historical task-bundle files.
- Removed a live fixture/document dependency on `.ai/scripts/experiment-foundation-protocol-hash.mjs` by documenting the canonical-JSON algorithm directly. The one-off historical tool remains eligible for retirement during `.ai` cleanup.
- Exact SHA-256 comparison passed for both relocated fixtures and both environment scripts.
- The remaining direct `dev-docs/archive/experiment-foundation-productization-closure/artifacts` consumers are T-132 one-off productization/landing scripts. They are not package entrypoints and will retire with their old `.ai` gates; copying that historical evidence into a new permanent runtime surface would preserve the obsolete mechanism.

## Phase 2 — Lifecycle normalization

- Queried the old authority at execution time and found exactly 55 effective `done` tasks under `dev-docs/active/`.
- Validated every resolved source and target before moving: sources were descendants of `dev-docs/active/`, targets were descendants of `dev-docs/archive/`, all sources existed, no target existed, and none of `T-043`, `T-129`, or `T-145` was selected.
- Moved all 55 bundles to `dev-docs/archive/` and ran the old authoritative sync once to refresh their metadata paths/statuses and derived hub views.
- Post-move inventory: 142 archived tasks, two planned active tasks (`T-043`, `T-129`), and one in-progress active task (`T-145`); zero effective `done` tasks remain active.
- Old governance lint passes after the lifecycle normalization.

## Known issues / follow-ups

- Node 24 emits ts-node loader deprecation warnings; focused tests pass with `TS_NODE_TRANSPILE_ONLY=1`, and both backend and desktop TypeScript checks pass normally.
- Maintained documentation, CI guidance, hooks, and package scripts still contain old governance/skill commands. They remain valid only until the bounded cutover and are scheduled for the integration cleanup phase.

## Pitfalls / dead ends

- Keep the detailed append-only record in `05-pitfalls.md`.
