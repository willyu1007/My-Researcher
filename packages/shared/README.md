# Shared package

Shared TypeScript contracts and utilities.

## Current modules

- Root entry: `@paper-engineering-assistant/shared`
  - Compatibility alias that re-exports the current research-lifecycle barrel.

- Clean barrel: `@paper-engineering-assistant/shared/research-lifecycle`
  - Re-exports all split research-lifecycle contract modules.

- Filename-aligned public subpaths:
  - `@paper-engineering-assistant/shared/research-lifecycle/research-lifecycle-core-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/literature-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts`

## Migration rule

- Repo-internal backend code must import research-lifecycle contracts from the filename-aligned subpaths, not from the shared root entry.
