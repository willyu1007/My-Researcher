# 04 Verification

## Planned checks
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- `pnpm --filter @paper-engineering-assistant/desktop run typecheck`
- `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --repo-root . --mode full`
- `node .ai/tests/run.mjs --suite ui`
- `rg -n "@import './styles/" apps/desktop/src/renderer/app-layout.css`
- `rg -n "import '.*styles/.*\\.css'|import \".*styles/.*\\.css\"" apps/desktop/src/renderer -g '*.{ts,tsx}'`

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - generated `dev-docs/active/desktop-legacy-css-retirement/.ai-task.yaml` with `task_id: T-022`
    - regenerated `.ai/project/main/dashboard.md`
    - regenerated `.ai/project/main/feature-map.md`
    - regenerated `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`
- [pass] `rg -n "T-022|desktop-legacy-css-retirement|R-010" .ai/project/main/registry.yaml .ai/project/main/dashboard.md .ai/project/main/feature-map.md .ai/project/main/task-index.md`
  - Result:
    - `R-010` 与 `T-022` 已出现在 registry 与全部 derived views 中。
- [pass] `find dev-docs/active/desktop-legacy-css-retirement -maxdepth 1 -type f | sort`
  - Result:
    - 任务包包含 `.ai-task.yaml`、`roadmap.md`、`00~05` 共 8 个预期文件。
- [pass] `pnpm --filter @paper-engineering-assistant/desktop run typecheck`
  - Result:
    - renderer/main desktop TypeScript compile passes
- [pass] `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --repo-root . --run-id t022-legacy-css-freeze --evidence-root .ai/.tmp/ui --mode full`
  - Result:
    - report path: `.ai/.tmp/ui/t022-legacy-css-freeze/ui-gate-report.md`
    - `Errors: 0`, `Warnings: 0`
    - `spec_status=OK`, `exception_status=OK`
    - gate keeps scanning `apps/desktop/src/renderer` while legacy `apps/desktop/src/renderer/styles` remains under temporary exclusion
- [pass] `node .ai/tests/run.mjs --suite ui`
  - Result:
    - `ui-system-bootstrap`, `ui-governance-gate`, `ui-governance-gate-approval-order`, `ui-style-intake-from-image` all pass
- [pass] `rg -n "@import './styles/" apps/desktop/src/renderer/app-layout.css`
  - Result:
    - `app-layout.css` 仍是唯一 legacy CSS 聚合入口，当前导入：
      - `shell.css`
      - `literature-base.css`
      - `literature-auto-import.css`
      - `literature-manual-import.css`
      - `literature-overview.css`
      - `modules-paper-writing.css`
- [pass] `rg -n "import '.*styles/.*\\.css'|import \".*styles/.*\\.css\"" apps/desktop/src/renderer -g '*.{ts,tsx}'`
  - Result:
    - renderer TS/TSX 中没有新增对 `apps/desktop/src/renderer/styles/**` 的直接 import
    - 唯一命中为 `apps/desktop/src/renderer/main.tsx` 对 `ui/styles/ui.css` 的导入
- [pass] `rg -n "app-layout\\.css" apps/desktop/src/renderer -g '*.{ts,tsx}'`
  - Result:
    - `apps/desktop/src/renderer/main.tsx` 是唯一 `app-layout.css` 导入点
- [pass] `pnpm --filter @paper-engineering-assistant/desktop run typecheck`
  - Result:
    - renderer/main desktop TypeScript compile still passes after the final dead-selector cleanup
- [pass] `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --repo-root . --run-id t021-cleanup-final --evidence-root .ai/.tmp/ui --mode full`
  - Result:
    - final cleanup run remains green
    - `Errors: 0`, `Warnings: 0`
    - `spec_status=OK`, `exception_status=OK`
- [pass] `node .ai/tests/run.mjs --suite ui`
  - Result:
    - UI suite still passes after the final cleanup pass
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - project hub derived views remain aligned after the final cleanup pass
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`

## Acceptance focus for this tranche
- `R-010` / `T-022` 已出现在 registry 与 derived views。
- `apps/desktop/src/renderer/app-layout.css` 仍是唯一 legacy CSS 聚合入口。
- `apps/desktop/src/renderer/styles/**` 已被声明为 frozen legacy compatibility layer。
- 根 `AGENTS.md` 已写明禁止新功能继续扩展 legacy CSS。
- UI gate 继续保持绿灯，且 approvals 仍然有效。

## Notes
- 本 tranche 没有修改 `ui/config/governance.json` 的 exclusion 列表；`apps/desktop/src/renderer/styles` 仍通过临时 exception 被排除在 scan root 之外。
- 本 tranche 只做声明/冻结，不迁移任何旧界面，也不删除任何 legacy CSS 文件。
- 本轮 `.ai/.tmp/ui/*` 临时 UI evidence 目录已在本地清理，不作为仓库产物保留。
