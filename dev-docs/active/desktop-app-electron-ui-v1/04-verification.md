# 04 Verification

## Automated checks
- [pass] `python3 .ai/skills/features/ui/ui-system-bootstrap/scripts/ui_specctl.py codegen`
  - Result: regenerated tokens and UI context artifacts successfully.
- [pass] `python3 .ai/skills/features/ui/ui-system-bootstrap/scripts/ui_specctl.py validate`
  - Result: token/contract validation passed after adding `morethan` themes.
- [pass] `pnpm install`
  - Result: workspace dependencies installed; desktop package dependencies resolved.
- [pass] `pnpm desktop:typecheck`
  - Result: renderer and electron main/preload TypeScript checks passed.
- [pass-with-warning] `pnpm desktop:build`
  - Result: build completed successfully; Vite emitted non-blocking warning about `ui/styles/ui.css` import order.
- [pass] `node .ai/scripts/ctl-project-governance.mjs map --project main --task T-004 --feature F-002 --milestone M-001 --requirement R-002 --apply`
  - Result: `T-004` governance mapping applied.
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: project governance sync/lint passed with no warning.

## Manual smoke checks
- [pending] Run `pnpm desktop:dev` on GUI environment and capture screenshot evidence.

## Rollout / Backout (if applicable)
- Rollout: feature-flag free in local dev only.
- Backout: revert `apps/desktop` and restore previous workspace scripts.
