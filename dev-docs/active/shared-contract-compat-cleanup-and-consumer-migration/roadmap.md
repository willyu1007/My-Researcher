# Shared Contract Compat Cleanup and Consumer Migration - Roadmap

## Goal
- 清理 `interface-field-contracts.ts` compat layer，建立 shared 的正式 filename-aligned public subpaths，并将 backend consumers 从根入口 `@paper-engineering-assistant/shared` 迁移到 bounded-context subpaths。

## Program position
- Follow-up task: `T-019 shared-contract-decomposition-wave4`
- Task ID: `T-020`
- Task slug: `shared-contract-compat-cleanup-and-consumer-migration`
- Project mapping target: `M-000 > F-000 > T-pending`
- Current status target: `planned`

## Why this task exists
- `T-019` 已将 `interface-field-contracts.ts` 收敛为纯 compat aggregator，但 compat link 仍停留在 shared 的公开导出链路中。
- 当前 backend `33` 个 consumers 全部从根入口 `@paper-engineering-assistant/shared` 获取 research-lifecycle contracts，bounded-context split 尚未变成正式 public API。
- 如果不补正式 subpath exports 并迁移 repo 内 consumers，compat layer 会继续留在长期 surface 中，后续边界治理会再次退回到“大而全”的 barrel 依赖。

## Scope
- Primary targets:
  - `packages/shared/package.json`
  - `packages/shared/src/research-lifecycle/index.ts`
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `packages/shared/src/research-lifecycle/topic-management-contracts.schema.test.ts`
  - `packages/shared/README.md`
  - `apps/backend/src/**`
- Allowed integration surfaces:
  - `packages/shared/src/index.ts`
  - backend static boundary tests
  - task governance docs and verification artifacts

## Explicit non-goals
- 不改 shared contract 的业务语义。
- 不改 REST path/method、OpenAPI 语义或 DB schema。
- 不引入 public API 短域名 alias。
- 不删除根入口 `@paper-engineering-assistant/shared` 对外兼容能力。
- 不迁移 desktop/frontend consumers。

## Inputs and fixed assumptions
| Input | Why it matters | Constraint carried into this task |
|---|---|---|
| `T-019` closure notes | 明确 compat cleanup 是 follow-up | 本任务是新任务，不 reopen `T-019` |
| backend consumer audit | 当前 repo 内只有 backend 真实依赖根入口 | 本任务迁移目标聚焦 `apps/backend/src` |
| `T-011` / `T-014` active tasks | 仍在推进相关 research-lifecycle 领域能力 | 实施前必须核对其状态并避免语义改写 |
| current workspace package model | shared 尚无 `exports` 字段与 subpath 先例 | 必须先建立正式 public subpaths，再迁 consumer |

## Migration strategy
### Public entrypoint strategy
- 引入 filename-aligned subpaths：
  - `@paper-engineering-assistant/shared/research-lifecycle/research-lifecycle-core-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/literature-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts`
  - `@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts`
- 可保留 `@paper-engineering-assistant/shared/research-lifecycle` clean barrel，但 repo 内 backend migration 目标是 file-named subpaths。

### Consumer migration strategy
- 先迁移单域 backend files，再处理 mixed-domain files。
- mixed-domain files 允许拆成多条 subpath import，不为“单 import 美观”牺牲边界清晰度。
- 根入口保留为对外兼容 alias，但新增 repo-internal guard，禁止 backend 新增或保留根入口 import。

## Entry gates
- `T-011` 与 `T-014` 当前状态已复核，且本任务不改动它们的业务契约。
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` 通过。
- `pnpm --filter @paper-engineering-assistant/shared typecheck` 与 `pnpm --filter @paper-engineering-assistant/backend typecheck` 在改动前为绿色。

## Acceptance
- `packages/shared/src/research-lifecycle/interface-field-contracts.ts` 已移除。
- backend `apps/backend/src` 内不再存在 `from '@paper-engineering-assistant/shared'` 根入口 import。
- shared 已提供正式 filename-aligned subpath exports，backend consumers 全部编译通过。
- shared tests 不再锁定 compat barrel。
- governance sync/lint、shared/backend typecheck/test、static audit 全通过。

## Rollback
- 若 subpath export 导致 consumer 解析失败，优先回退 package `exports` 与 import rewrites，再恢复 compat file。
- 若 mixed-domain 文件迁移引发问题，优先单文件回退到上一步 stable patch，不放弃整体 subpath 设计。
- 根入口兼容 alias 保留，作为临时回退保护层。
