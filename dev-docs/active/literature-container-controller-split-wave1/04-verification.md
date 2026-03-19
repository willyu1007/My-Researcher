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
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | pass | 校验前端类型边界 |
| `pnpm --filter @paper-engineering-assistant/desktop build` | pass | 校验模块/样式入口 |
| `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` | pass | 校验 auto/manual import 主流程无回归 |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `.ai-task.yaml`
    - 分配任务 ID：`T-018`
    - 登记到 project hub derived views
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 任务收尾时再次执行，当前无 warning
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - pass
    - auto/manual import controller facade 与 grouped tab props 均完成类型闭合
- [pass] `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result:
    - pass
    - renderer 重新产出 `dist/renderer/assets/index-DlAHY5w2.js`
    - renderer 继续复用 `dist/renderer/assets/index-DNclcd37.css`
- [pass] `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
  - Result:
    - `[desktop-smoke] PASS`
    - dev 进程以 `143` 退出，为 smoke 脚本收尾阶段的预期行为

## Evidence to capture during implementation
- `App.tsx` 对 auto/manual import 的 props 组织方式变化
- `AutoImportTab.tsx` 是否收敛为 container + subviews
- `useAutoImportController.ts` / `useManualImportController.ts` 是否形成稳定子模块
- typecheck/build/smoke 的最终结果

## Final evidence
- `App.tsx` 已由 flat controller destructuring + flat tab props 改为 controller facade + grouped props DTO。
- `AutoImportTab.tsx` 已下沉为 `views/*` 组合，主文件只保留局部 UI state、editor helper 和 subview assembly。
- `useAutoImportController.ts` 与 `useManualImportController.ts` 已收敛为 facade；核心逻辑已落在 `controllers/*`。
- post-close review findings 已收口：
  - 新建主题保存时重新使用与界面预览一致的 `topic_id` 生成逻辑。
  - `AutoImportTab.tsx` 中与规则调度/来源相关的 helper 已移除 review 指出的 `any`。
- 当前行数：
  - `App.tsx`: `1299`
  - `AutoImportTab.tsx`: `1074`
  - `useAutoImportController.ts`: `36`
  - `useManualImportController.ts`: `37`
