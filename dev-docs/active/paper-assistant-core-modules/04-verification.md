# 04 Verification

## Automated checks
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs status --repo-root .` -> PASS（在 cleanup 前）
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs update-root-docs --repo-root . --apply` -> PASS
- `node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs cleanup-init --repo-root . --apply --i-understand --archive` -> PASS
- `npm run -s typecheck` -> FAIL（`tsc: command not found`，依赖未安装）

## Manual smoke checks
- 仓库结构检查：`apps/`, `packages/`, `ci/`, `env/`, `docs/project/overview/` 均存在。
- 初始化归档检查：`docs/project/overview/` 包含 Stage A 文档、blueprint、init-state、START-HERE、INIT-BOARD。
- 清理检查：`init/` 目录已移除。

## Rollout / Backout (if applicable)
- Rollout:
  - 以 `dev-docs` 任务包为执行入口，后续按模块进入实现。
- Backout:
  - 如任务包方向不一致，可回退至 `roadmap.md` 重新拆分批次，不影响业务代码。
