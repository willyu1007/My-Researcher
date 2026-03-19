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
    - 仅保留历史 warning：`T-012` 与 `T-013` 的 `00-overview.md` 状态格式问题

## Evidence to capture during implementation
- facade public surface 盘点
- 内部模块划分与委派关系
- targeted unit tests 与整体 backend test 结果
- Prisma-only boundary 仍成立的证据
