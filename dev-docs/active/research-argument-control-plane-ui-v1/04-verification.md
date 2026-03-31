# 04 Verification

## Planned checks
- `pnpm --filter @paper-engineering-assistant/desktop run typecheck`
- `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --repo-root . --run-id <run-id> --evidence-root .ai/.tmp/ui --mode full`
- `node .ai/tests/run.mjs --suite ui`
- governance sync/lint

## Executed checks
- Pending in current implementation pass.

## Pre-handoff review for planner/explainability integration
- [ ] 所有最小视图都已有稳定 backing DTO。
- [ ] UI 已能显示 `severity / detail / pointers`，且不丢 traceability。
- [ ] confirmation / override / audit reason 流程已冻结。
- [ ] 缺失字段已回流到 `T-024` / `T-025` / `T-026` 收口，而不是在 UI 层临时拼补。
