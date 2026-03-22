# 02-architecture

## Context & current state
- `packages/shared` 目前通过根入口 `@paper-engineering-assistant/shared` 暴露 research-lifecycle contracts，`research-lifecycle/index.ts` 仍经过 `interface-field-contracts.ts` 兼容层。
- backend `apps/backend/src` 现有 `33` 个 code imports 使用 shared 根入口；其中大部分天然落在单一 bounded context，少量文件混用多个 contract domains。
- shared package 尚未定义 `exports` 字段，因此 repo 内还没有正式 public subpath contract。

## Proposed design

### Components / modules
- Shared package surface
  - root alias: `@paper-engineering-assistant/shared`
  - clean barrel: `@paper-engineering-assistant/shared/research-lifecycle`
  - file-named subpaths:
    - `@paper-engineering-assistant/shared/research-lifecycle/research-lifecycle-core-contracts`
    - `@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts`
    - `@paper-engineering-assistant/shared/research-lifecycle/literature-contracts`
    - `@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts`
    - `@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts`
- Backend import boundary
  - `apps/backend/src` 只能使用 file-named subpaths
  - mixed-domain 文件可存在多个 shared import declarations

### Interfaces & contracts
- Package exports
  - `packages/shared/package.json` 新增 `exports`，为 root、clean barrel、各 file-named subpaths 提供稳定入口。
- Barrel contract
  - `packages/shared/src/research-lifecycle/index.ts` 直接 `export *` 所有 split modules，不再间接依赖 compat aggregator。
- Repo-internal guard
  - backend 新增静态测试，遍历 `apps/backend/src` 下 `.ts` 文件并断言不存在 `@paper-engineering-assistant/shared` 根入口 import。

### Boundaries & dependency rules
- Allowed dependencies:
  - backend 可依赖 shared file-named subpaths
  - shared root alias 可继续对 repo 外部/未迁移 consumer 兼容
- Forbidden dependencies:
  - backend 不得依赖 shared 根入口
  - backend 不得依赖 `packages/shared/src/...` 内部实现路径
  - implementation 不得混入 business semantic changes

## Data migration
- Migration steps:
  - create public subpaths
  - migrate backend imports
  - remove compat file
  - add guard
- Backward compatibility strategy:
  - root alias 保留
  - clean barrel 可保留
  - compat file 删除前，确保 backend imports 已全部迁离根入口
- Rollout plan:
  - single patch migration in repo
  - verification gates run immediately after migration

## Non-functional considerations
- Security/auth/permissions:
  - no auth boundary changes
- Performance:
  - import path refactor only; no runtime behavior changes intended
- Observability:
  - verification evidence recorded in `04-verification.md`

## Open questions
- None. The task is implementation-ready under the locked assumptions in roadmap/plan.
