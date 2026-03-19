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
| `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | 校验 shared contract 边界 |
| `pnpm --filter @paper-engineering-assistant/shared test` | pass | 校验 shared schema/contract 行为 |
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | 校验 backend consumers |
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | pass | 校验 desktop consumers |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `.ai-task.yaml`
    - 分配任务 ID：`T-019`
    - 登记到 project hub derived views
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 仅保留历史 warning：`T-012` 与 `T-013` 的 `00-overview.md` 状态格式问题

## Evidence to capture during implementation
- contract slice 列表与 barrel 关系
- consumer audit 结果
- 兼容导出保留清单
- shared/backend/desktop 验证结果
