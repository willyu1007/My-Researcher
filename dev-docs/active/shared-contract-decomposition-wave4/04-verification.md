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
    - 无 warning
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result:
    - `7` tests passed / `0` failed
    - shared schema baseline 在拆分前为绿色
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - desktop renderer/main `tsc --noEmit` 通过
    - shared contract consumers 在拆分前为绿色
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result:
    - compat aggregator 与新 domain contract files 同时存在时，shared `tsc --noEmit` 通过
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result:
    - `9` tests passed / `0` failed
    - shared schema smoke 在拆分后仍为绿色
    - compat barrel export surface 与关键 helper/schema reachability 已加入 shared 回归
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - backend consumers 通过旧 barrel 路径继续编译
    - 初次 consumer audit 发现的 `Zotero*` / `UpdatePaperLiteratureLinkResponse` shape 漏项已修复
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - desktop consumers 通过旧 barrel 路径继续编译

## Evidence to capture during implementation
- contract slice 列表与 barrel 关系
- consumer audit 结果
- 兼容导出保留清单
- shared/backend/desktop 验证结果
