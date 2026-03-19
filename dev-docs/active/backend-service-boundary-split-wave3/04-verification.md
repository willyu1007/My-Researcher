# 04-verification

## Planned verification matrix
### Governance
| Command | Expected result | Purpose |
|---|---|---|
| `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | 为该任务生成 `.ai-task.yaml` 并登记到 project hub | 注册任务 |
| `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | lint 通过；若有 warning，需标注是否为历史遗留 | 校验治理一致性 |

### Implementation
| Command | Expected result | Purpose |
|---|---|---|
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | 校验 service/repository 类型边界 |
| `pnpm --filter @paper-engineering-assistant/backend test` | pass | 校验整体 backend 行为稳定 |
| `pnpm --filter @paper-engineering-assistant/backend test -- src/services/auto-pull-service.unit.test.ts` | pass | 校验 auto-pull facade 兼容 |
| `pnpm --filter @paper-engineering-assistant/backend test -- src/services/literature-flow-service.unit.test.ts` | pass | 校验 literature-flow facade 兼容 |
| `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | 校验 shared 依赖边界未被破坏 |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `.ai-task.yaml`
    - 分配任务 ID：`T-016`
    - 登记到 project hub derived views
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 无 warning
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - `prisma generate` 与 backend `tsc --noEmit` 通过
    - backend service/repository 边界在实施前为绿色基线
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result:
    - `93` tests passed / `0` failed
    - 包含 `auto-pull-service.unit.test.ts`
    - 包含 `literature-flow-service.unit.test.ts`
    - 包含 `auto-pull-routes.integration.test.ts`
- [pass] `pnpm --filter @paper-engineering-assistant/backend test -- src/services/auto-pull-service.unit.test.ts`
  - Result:
    - Node test runner最终执行完整 backend test set
    - `93` tests passed / `0` failed
    - `AutoPullService`、`auto-pull` routes 与 `LiteratureFlowService` 相关回归保持绿色
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result:
    - shared `tsc --noEmit` 通过
    - backend 这次内部拆分没有引入跨包类型漂移
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - `LiteratureFlowService` runtime 拆分后 backend `tsc --noEmit` 仍通过
    - `services/literature-flow/` 新增模块未引入 facade 类型漂移
- [pass] `pnpm --filter @paper-engineering-assistant/backend test -- src/services/literature-flow-service.unit.test.ts`
  - Result:
    - Node test runner最终执行完整 backend test set
    - `93` tests passed / `0` failed
    - `literature-flow` 相关关键用例全部通过，包括 rights gate、artifact overwrite、embedding version activation/failure fallback
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - `PrismaLiteratureRepository` 分区后 backend `tsc --noEmit` 仍通过
    - `repositories/prisma/literature/` 新增 facade delegates 与 mapper 模块未引入类型漂移
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result:
    - `93` tests passed / `0` failed
    - auto-pull routes/service、literature-flow、literature workflow routes、retrieval、pipeline orchestrator 全部保持绿色
- [pass] `cd apps/backend && node --test --loader ts-node/esm src/services/auto-pull/auto-pull-topic-context.test.ts`
  - Result:
    - `5` tests passed / `0` failed
    - `auto-pull` helper slices 的 binding / context / guard 语义已被定向覆盖
- [pass] `cd apps/backend && node --test --loader ts-node/esm src/repositories/prisma/literature/prisma-literature-record-mappers.test.ts`
  - Result:
    - `3` tests passed / `0` failed
    - Prisma literature mapper 拆分后的 normalization / serialization 语义已被定向覆盖

## Evidence to capture during implementation
- facade public surface 盘点
- 内部模块划分与委派关系
- targeted unit tests 与整体 backend test 结果
- Prisma-only boundary 仍成立的证据
