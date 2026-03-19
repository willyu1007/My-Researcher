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
    - 本轮收口前已先清理历史 warning，当前治理检查为全绿
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - `normalizers.ts` compatibility barrel 与新 `shared/normalizers/*` 模块全部通过 TS 校验
- [pass] `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result:
    - Vite renderer build passed
    - desktop main build passed
    - 新 CSS 聚合入口与子模块导入顺序可被完整打包
- [pass] `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
  - Result:
    - `[desktop-smoke] PASS`
    - dev server 退出时的 `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` / exit 143 为 smoke 脚本结束后主动回收 dev 进程，不构成功能回归
- [pass] export set audit for `normalizers.ts`
  - Result:
    - 拆分前后导出集合一致：`missing=[]`, `added=[]`
- [pass] class set audit for split CSS files
  - Result:
    - old `shell.css` class 集合在新 style 模块中全部可追踪
    - old `literature-auto-import.css` / `literature-manual-import.css` class 集合均无丢失
- [pass] post-review rerun: `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - 修复 `literature-defaults-grid` 缺口与 `normalizers.ts` 自引用路径问题后再次通过
- [pass] post-review rerun: `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result:
    - 重新生成 desktop renderer dist 产物，构建通过
- [pass] post-review rerun: `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
  - Result:
    - `[desktop-smoke] PASS`
    - dev server 回收时的 exit 143 仍为预期行为

## Evidence to capture during implementation
- `normalizers.ts` 导出迁移表
- CSS 聚合入口与 import order 清单
- selector / `data-ui` 兼容证据
- typecheck/build/smoke 结果
