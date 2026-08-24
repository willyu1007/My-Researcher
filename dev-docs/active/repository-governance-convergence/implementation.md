# 仓库治理收敛 / Repository governance convergence — Implementation Notes

## Status

- Current status: `done`
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

## Phase 3 — Fixed-contract conversion

- Refreshed task-governance fixed assets only from `AI-Related-Auxiliary/system/resources/task-governance`.
- Converted all 145 task identities without renumbering: 142 compact archives and three active bundles.
- Rebuilt the project hub as `registry.json` plus generated `dashboard.md` and `feature-map.md`.
- Compared normalized old/new Milestone, Feature, and task projections. The exact M-000/M-001 and F-000/F-001/F-002 graph, task IDs, lifecycle, paths, and F/M mappings are preserved.
- Kept the 13 former Requirement records as migration provenance only; no Requirement became a Feature or parallel authority.
- New strict governance lint and dry-run synchronization pass. Queries confirm T-043 and T-129 remain planned at F-001/M-001 and T-145 remains the sole in-progress task at F-000/M-000.

## Phase 4 — Integration and UI cleanup

- Reduced `.ai/` to the project hub, governance CLI, and its four governance libraries.
- Removed `.codex/skills`, `.claude/skills`, and `.ai/skills`, including their sync wrappers and lint paths.
- Relocated seven independently supported validation/export scripts to `apps/backend/scripts/`; retired task-specific landing gates, scenario harnesses, generated evidence tools, and obsolete package entrypoints.
- Repointed supported root/backend commands and moved runtime artifacts to the ignored repository-level `artifacts/` boundary.
- Removed obsolete context registries, generated API indexes, environment registries, UI specs, and database mirror docs; rewrote maintained repository/context guidance around direct code/schema/process ownership.
- Updated CI and local hooks to use strict new governance lint/sync/query interfaces.
- Removed UI approvals, codegen, config, contracts, patterns, token-source governance, and spec-version scaffolding. Preserved `ui/styles/**` unchanged at the selector/import level and documented it as a runtime compatibility boundary pending a future UI redesign.
- Recovered `docs/context/process/topic-selection-scenarios.md` from the old-contract checkpoint after a default matrix test exposed it as a live scenario contract. Its obsolete script-registration section was removed and the maintained matrix now owns only current scenario consistency.

## Verification-driven corrections

- Node 24 selected the spec reporter by default while the runtime stress aggregator parses TAP. The six child Node test steps now request `--test-reporter=tap` explicitly.
- The runtime stress manifest still required three trusted-evidence finalization cases and one result-analysis materialization case that the July Pack C cutover intentionally retired. Current tests enforce the opposite ownership boundary, so the stale required-case list was removed/renamed instead of reintroducing retired behavior.
- The second full stress execution passed every underlying lane: L5 92/92; runtime regression 324 passed, 16 intentional skips, zero failures; deterministic 15/15; queue 5/5; live adapter 9/9 plus ownership; provider variance 5/5 plus ownership. The final aggregator failed only on the three stale retired required-case names. Recalculating the same run after their exact removal passed all coverage groups; focused manifest/ownership checks validate the correction without a third 15-minute rerun.

## Known issues / follow-ups

- Node 24 emits ts-node loader deprecation warnings. They are non-failing runtime noise; focused tests use `TS_NODE_TRANSPILE_ONLY=1`, while normal package typechecks pass.
- The retained `ui/styles/` layer is intentionally a compatibility boundary, not a recommendation to preserve its current organization during the later UI refactor.

## Pitfalls / dead ends

- Keep the detailed append-only record in `05-pitfalls.md`.
