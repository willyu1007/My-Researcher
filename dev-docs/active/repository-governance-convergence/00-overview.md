# 仓库治理收敛 / Repository governance convergence

## Status

- State: in-progress
- Next step: checkpoint the verified live-asset relocation, then normalize lifecycle placement and begin the bounded governance cutover.

## Goal

Migrate repository task governance to the approved new fixed-asset contract while preserving the current Milestone/Feature graph, retained active tasks, live fixtures/contracts, and runtime UI CSS.

## Non-goals

- Do not mix migration changes into the task-opening checkpoint.
- Do not create or redefine a Milestone, Feature, or Requirement.
- Do not change application behavior, APIs, database schema, CI behavior, hooks, root documentation, skills, or UI during the opening.
- During later execution, do not archive `T-043` or `T-129`, mutate the current M/F graph, remove runtime UI CSS, or compress archives before live-asset relocation is verified.
- Do not retain a permanent mixed old/new governance system.

## Context

The repository currently uses the old seven-file dev-docs bundle contract, `.ai-task.yaml` task identity allocated by the old CLI, and `.ai/project/main/registry.yaml` semantic mapping. The 2026-08-24 opening inventory reports 55 effective `done` bundles still under `dev-docs/active`, two pre-existing `planned` tasks (`T-043` and `T-129`), and no `in-progress` or `blocked` task. `.ai/` also contains skills, scripts, tests, LLM configuration, and other mechanisms beyond the project hub, while `ui/` combines runtime styles with governance scaffolding.

The migration direction is already approved: preserve the graph, normalize task lifecycle placement, remove repository-local skill machinery, refresh fixed task-governance assets, convert task/hub records to the new contract, reduce `.ai/` to the project hub, preserve runtime CSS while removing UI governance scaffolding, clean references, and relocate live fixtures/contracts before archive compression.

## Acceptance criteria

- [x] The old-contract opening has a CLI-allocated unique Task ID and maps to `F-000` / `M-000` without a new M/F/R object.
- [x] Before migration, the current M/F graph, task lifecycle inventory, and consumers of removal/archive-bound paths are captured.
- [ ] Every effective `done` active bundle at the execution baseline is archived; `T-043` and `T-129` remain active.
- [x] Every live fixture/contract needed by supported code/tests is relocated to a maintained owner and its focused consumers are verified before archive compression.
- [ ] Approved fixed task-governance assets are refreshed; repository-local skill mechanisms are removed.
- [ ] All task bundles and the project hub conform to the new contract with unique stable task IDs.
- [ ] The pre-migration M/F graph is semantically unchanged after conversion.
- [ ] `.ai/` contains only the project hub after cutover.
- [ ] UI governance scaffolding is removed without deleting or breaking runtime UI CSS.
- [ ] CI, hooks, and maintained documentation contain no stale references to retired governance paths or commands.
- [ ] Archive compression, if performed, occurs only after live-asset relocation and recovery checks pass.
- [ ] New-contract governance lint and all targeted reference/import checks pass with a reviewable final diff.

## Handoff boundary

- This opening checkpoint records scope and sequencing only; the user has already authorized implementation after it lands.
- After the opening commit, read `roadmap.md`, set the task to `in-progress`, and execute `01-plan.md` from Phase 0. Stop before destructive work if the fixed new-contract assets or a safe live-asset relocation map cannot be proven.
