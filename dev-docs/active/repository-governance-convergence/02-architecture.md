# 仓库治理收敛 / Repository governance convergence — Architecture

## Context and current state

- Task progress is currently authoritative in each bundle's `00-overview.md`; task identity is authoritative in CLI-owned `.ai-task.yaml`; semantic project mapping is authoritative in `.ai/project/main/registry.yaml`.
- The old CLI scans configured `dev-docs` roots, allocates the next unused monotonically increasing `T-###`, defaults unmapped tasks to `F-000` / `M-000`, updates registry tasks, and regenerates derived views.
- The current graph contains reserved inbox nodes plus the existing product Milestone/Feature hierarchy. Migration must preserve that graph, not reinterpret it.
- `.ai/` currently mixes the project hub with repository-local skills, scripts, tests, LLM configuration, and scenario assets.
- `ui/` currently contains runtime styles/tokens and governance-oriented approvals, codegen, config, contracts, and patterns. Classification must be consumer-driven.
- Historical task material may contain files that remain live inputs to tests, tooling, or documentation; archive location alone does not prove an item is dead.

## Target authority model

1. Approved fixed task-governance assets define the new contract and tooling.
2. Repository task bundles and the project hub store project-specific records under that contract.
3. `.ai/` contains only the project hub; repository-local skill/tool authority is removed.
4. Runtime UI CSS remains owned by the UI/runtime path, independent of removed UI governance scaffolding.
5. Historical task archives are evidence, not a live dependency source; any live fixture/contract is owned elsewhere before compression.

## Migration topology

```text
old contract + old CLI
        |
        v
baseline snapshot and consumer inventory
        |
        v
relocate live fixtures/contracts
        |
        v
archive effective-done active bundles
        |
        v
fixed new governance assets + full record conversion
        |
        +--> project hub only under .ai/
        +--> preserved M/F graph and stable task IDs
        +--> retained active T-043 and T-129
        |
        v
UI/reference cleanup
        |
        v
archive compression last
```

## Contracts and invariants

### Identity and lifecycle

- Task IDs are stable, unique, and tool-allocated; they are never guessed, reused, or bulk-renumbered.
- `T-043` and `T-129` remain active throughout the migration.
- Effective `done` bundles under `active/` move to archive without changing their identity or historical content beyond contract conversion.
- This convergence task remains planned until implementation kickoff and remains active until verified closure.

### Project graph

- Preserve Milestone and Feature IDs, fields, and edges exactly at the semantic level.
- Do not create a migration-specific Milestone, Feature, or Requirement.
- The convergence task uses the reserved inbox placement `F-000` / `M-000`.
- Derived views are regenerated; they are not hand-edited as authority.

### Governance assets

- The current old contract remains authoritative until the cutover checkpoint.
- The new contract comes only from approved fixed task-governance assets.
- Conversion must finish with one authority; compatibility shims are temporary and removed in the same migration.
- `.ai/` postcondition: project hub only.

### UI boundary

- Preserve runtime style loading through `ui/styles/ui.css` and any still-required `ui/styles/desktop-runtime/**` selectors.
- Do not recreate the retired `apps/desktop/src/renderer/styles/**` layer or `apps/desktop/src/renderer/app-layout.css`.
- Remove only assets proven to be governance scaffolding or replace their supported consumer references first.

### Archive boundary

- A file is historical only when no live code, test, CI, hook, or maintained documentation consumes it.
- Live fixtures/contracts move to their owning maintained surface before task archives are compressed.
- Compression must retain a discoverable index, integrity evidence, and a documented recovery path.

## Interfaces and ownership

- Old opening interface: `node .ai/scripts/ctl-project-governance.mjs` owns allocation, mapping, sync, and lint until this task is registered and old lint passes.
- New migration interface: commands and file schemas supplied by the approved fixed assets; exact names are discovered from those assets and must not be invented here.
- Project graph owner: project hub registry/manifest defined by the active contract.
- Task status owner: bundle status field defined by the active contract.
- UI runtime owner: renderer entrypoint plus `ui/styles/` runtime files, not the governance contract.
- Fixture/contract owner: the maintained module or test/docs surface that consumes the item.

## Data migration

- Application/database migration: none.
- Repository-record migration: all active/archive task records and project-hub graph/derived views.
- Filesystem lifecycle migration: effective-done bundles to archive; live artifacts out of archive-bound/removal-bound locations; historical archives compressed last using the format supported by the new contract.
- Backward compatibility: preserve the old system through the pre-cutover checkpoint, then complete the new conversion without leaving dual authority.

## Failure and rollback rules

- Stop before destructive work if the old baseline is not clean, the fixed asset source is unavailable, the graph conversion is lossy, or a removal-bound path has unresolved live consumers.
- Checkpoint before archive moves, governance cutover, UI removal, reference cleanup, and compression.
- Restore the last coherent single-contract checkpoint on failure; do not patch around an inconsistent hybrid.
- Never use rollback to delete retained tasks, rewrite IDs, mutate the M/F graph, or discard unresolved live assets.

## Non-functional considerations

- Recoverability: phase-local checkpoints, archive index, and extraction/read proof.
- Auditability: normalized before/after graph and task inventories plus recorded command results.
- Simplicity: one governance authority, one project hub, no repository-local skill framework, and no duplicate UI governance layer.
- Security: no secrets, credentials, global configuration, external deployment, or paid execution.
- Performance: not a product-runtime concern; prefer deterministic bulk conversion and bounded repository scans.

## Technical discovery questions

- Confirm the authoritative new fixed-asset source and its supported conversion command.
- Enumerate exact repository-local skill wrapper paths and every consumer before removal.
- Build the live fixture/contract consumer map before archive movement or compression.
- Prove the runtime/governance split inside `ui/` from imports and entrypoints rather than directory names alone.
