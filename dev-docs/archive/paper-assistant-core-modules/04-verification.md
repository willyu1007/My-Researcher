# 04 Verification

## Automated checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --status in-progress --json`
  - Result: 仅剩执行中的治理/桌面任务，`T-002` 维持模块任务包 SSOT 定位。
- [pass] `rg -n "TP-0[1-8]" dev-docs/active/paper-assistant-core-modules/06-task-packages.md`
  - Result: 8 个任务包条目完整可检索。
- [pass] `rg -n "Owner and handoff mapping|Execution-ready queue|Batch A|Batch B|Batch C" dev-docs/active/paper-assistant-core-modules/06-task-packages.md`
  - Result: owner/依赖/批次队列已冻结。
- [pass] `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass（`6 passed, 0 failed`）；端到端治理主链路与任务包定义兼容。
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs status --repo-root .` -> PASS（在 cleanup 前）
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs update-root-docs --repo-root . --apply` -> PASS
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs cleanup-init --repo-root . --apply --i-understand --archive` -> PASS
- `npm run -s typecheck` -> FAIL（`tsc: command not found`，依赖未安装）
- `rg -n "TP-0[1-8]|M[1-8]" dev-docs/active/paper-assistant-core-modules dev-docs/active/llm-research-lifecycle-governance-v1` -> PASS（模块编号与 TP 映射存在且可交叉检索）
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` -> PASS with warning（历史遗留 `T-001` 路径缺失）

## Manual smoke checks
- 仓库结构检查：`apps/`, `packages/`, `ci/`, `env/`, `docs/project/overview/` 均存在。
- 初始化归档检查：`docs/project/overview/` 包含 Stage A 文档、blueprint、init-state、START-HERE、INIT-BOARD。
- 清理检查：`init/` 目录已移除。
- 边界检查：`T-002` 已声明为模块包 SSOT，`T-003` 已声明为阶段/版本治理 SSOT，并共享单一边界契约文件。

## Rollout / Backout (if applicable)
- Rollout:
  - 以 `dev-docs` 任务包为执行入口，后续按模块进入实现。
- Backout:
  - 如任务包方向不一致，可回退至 `roadmap.md` 重新拆分批次，不影响业务代码。
