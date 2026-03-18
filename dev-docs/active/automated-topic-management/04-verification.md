# 04 Verification

## Automated checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - `[ok] Sync complete.`
    - regenerated:
      - `.ai/project/main/dashboard.md`
      - `.ai/project/main/feature-map.md`
      - `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`
    - unrelated warnings remain for existing tasks:
      - `app-tsx-layout-split`: missing `## Status` / `- State: <status>` in `00-overview.md`
      - `topic-initial-pull-and-rule-preview`: missing `## Status` / `- State: <status>` in `00-overview.md`
  - Note:
    - warnings are pre-existing and not caused by `T-014`

## Manual checks
- [pass] 任务包完整性检查
  - Check:
    - 目录包含 `roadmap + 00~05 + .ai-task.yaml`
  - Evidence:
    - `Get-ChildItem dev-docs/active/automated-topic-management | Select-Object Name`
  - Result:
    - 任务包结构符合 repo 约定
- [pass] roadmap 质量检查
  - Check:
    - roadmap 明确区分模块边界、MVP 范围、后置增强项和 open questions
  - Evidence:
    - `roadmap.md` 中存在 `Non-goals`、`Open questions and assumptions`、`Phases`、`Step-by-step plan`
  - Result:
    - 后续讨论可直接围绕 roadmap 收敛，不需要重新做上下文整理
- [pass] architecture 边界检查
  - Check:
    - `02-architecture.md` 是否明确区分 `topic settings`、topic decision layer、`paper-project`
  - Evidence:
    - `02-architecture.md` 中存在 `Boundary model` 与 `Promotion bridge`
  - Result:
    - 已明确区分检索配置对象与研究命题对象
- [pass] project hub registration 检查
  - Check:
    - `T-014` 和 `R-009` 已进入 registry 与 derived views
  - Evidence:
    - `rg -n "R-009|T-014|automated-topic-management" .ai/project/main/registry.yaml .ai/project/main/task-index.md .ai/project/main/feature-map.md .ai/project/main/dashboard.md`
  - Result:
    - 新 requirement/task 已在 project hub 中可查询

## Rollout / Backout
- Rollout:
  - 完成文档创建后，同步 project hub，作为后续讨论与实现拆分的上下文基线。
- Backout:
  - 如果任务命名、映射或范围判断错误，可删除 `dev-docs/active/automated-topic-management/`，回退 registry 相关条目后重新执行 `sync --apply`。

## Rollback checks
- [pass] registry 回滚可执行性
  - Check:
    - 删除新增 requirement/task 后重新 `sync --apply`
  - Expected:
    - project hub 不再包含 `T-014`
  - Note:
    - 当前未执行实际回滚，仅确认回滚路径清晰且可操作
