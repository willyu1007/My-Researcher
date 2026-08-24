# 04 Verification

## 2026-05-19 Post-review Fixes
- PASS: `pnpm --filter @paper-engineering-assistant/desktop typecheck`
- PASS: `pnpm --filter @paper-engineering-assistant/desktop build`
- PASS: `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full`
  - Passing report: `.ai/.tmp/ui/20260518T221446Z-86758/ui-gate-report.md`
- PASS: `node .ai/tests/run.mjs --suite ui`
- PASS: `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
- PASS: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- PASS: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- PASS: `git diff --check`
- Review fixes verified:
  - evidence/sidecar records now have detail and scoped create/upsert controls in the execution/evidence view;
  - registry, promotion, recipe/materialization, and evidence record filters are panel-scoped;
  - promotion candidate kind options no longer include triage reports;
  - T-078 plan wording no longer claims renderer-owned recipe generation or result validation.

## 2026-05-18
- PASS: `pnpm --filter @paper-engineering-assistant/desktop typecheck`
- PASS: `pnpm --filter @paper-engineering-assistant/desktop build`
- PASS: `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
- PASS after remediation: `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full`
  - First run failed on dynamic `data-tone`; fixed by rendering explicit data-ui tone literals.
  - Passing report: `.ai/.tmp/ui/20260518T142440Z-27738/ui-gate-report.md`
- PASS: `node .ai/tests/run.mjs --suite ui`
- PASS: Electron visual smoke with memory backend:
  - `实验基座` appears below `文献管理`.
  - Registry page renders filters, empty state, record editor, and no backend error under memory repository.
  - Execution/evidence page renders job filters, submit/sync/cancel/collect controls, disabled job actions without selection, and evidence record selector.
- NOTE: Chrome DevTools browser smoke was unavailable because `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` is not installed. Electron/Computer Use was used for the visual smoke.
- PASS: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- PASS with unrelated warning: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Warning: `topic-selection-desktop-workbench-v1abc` lacks `00-overview.md`; unrelated to T-078.
- PASS: `git diff --check`

## Planned Checks
- Desktop typecheck and UI tests where available.
- UI governance gate.
- Browser smoke for nav and core states.

## Review Checklist
- [x] `实验基座` appears below `文献管理`.
- [x] No legacy CSS paths are recreated.
- [x] Disabled/blocked states reflect backend readiness/job selection.
