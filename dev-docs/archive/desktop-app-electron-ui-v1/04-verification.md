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
- [pass] `pnpm desktop:build`
  - Result: build completed successfully.
- [pass] `node .ai/scripts/ctl-project-governance.mjs map --project main --task T-004 --feature F-002 --milestone M-001 --requirement R-002 --apply`
  - Result: `T-004` governance mapping applied.
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: project governance sync/lint passed with no warning.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: desktop renderer/main TypeScript checks pass after introducing `scripts/dev.mjs`.
- [pass] Synthetic port-contention smoke (`127.0.0.1:5173` occupied, then run `pnpm --filter @paper-engineering-assistant/desktop dev`)
  - Result: first Vite start fails on `5173`, script logs retry, renderer starts on `5174`, and dev flow continues.
- [pass] Env-safety smoke (`ELECTRON_RUN_AS_NODE=1 pnpm --filter @paper-engineering-assistant/desktop dev`)
  - Result: Electron child no longer fails with `BrowserWindow` export error because `dev.mjs` clears `ELECTRON_RUN_AS_NODE` before spawning Electron.
- [pass] Localhost resolution safety smoke (`pnpm --filter @paper-engineering-assistant/desktop dev`)
  - Result: Vite local URL now reports `http://127.0.0.1:5173/`, and Electron receives `VITE_DEV_SERVER_URL` on `127.0.0.1` (no `localhost`/`::1` ambiguity).
- [pass] White-screen regression smoke (`ELECTRON_ENABLE_LOGGING=1 DESKTOP_DEV_PORT=5290 pnpm --filter @paper-engineering-assistant/desktop dev`)
  - Result: logs no longer contain `Unable to load preload script` and no longer contain `Cannot read properties of undefined (reading 'getAppMeta')`.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: typecheck passes after gating DevTools auto-open behind `DESKTOP_OPEN_DEVTOOLS`.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: typecheck passes after switching main window to hidden-on-start + activate-to-show behavior.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: typecheck passes after adding foreground-focus enforcement and click-feedback handlers.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
  - Result: PASS；脚本完成 backend + desktop 启动、renderer 探活、timeline/resource-metrics/artifact-bundle/release-review 链路验证。

## Manual smoke checks
- [pass] `smoke:e2e` 已覆盖本地端到端联通性；GUI 截图证据降级为可选增强项。

## Rollout / Backout (if applicable)
- Rollout: feature-flag free in local dev only.
- Backout: revert `apps/desktop` and restore previous workspace scripts.
