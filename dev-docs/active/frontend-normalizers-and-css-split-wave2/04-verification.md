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
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | pass | 校验 normalizer 类型边界 |
| `pnpm --filter @paper-engineering-assistant/desktop build` | pass | 校验样式入口与聚合顺序 |
| `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` | pass | 校验前端主流程和样式无回归 |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `.ai-task.yaml`
    - 分配任务 ID：`T-017`
    - 登记到 project hub derived views
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 仅保留历史 warning：`T-012` 与 `T-013` 的 `00-overview.md` 状态格式问题

## Evidence to capture during implementation
- `normalizers.ts` 导出迁移表
- CSS 聚合入口与 import order 清单
- selector / `data-ui` 兼容证据
- typecheck/build/smoke 结果
