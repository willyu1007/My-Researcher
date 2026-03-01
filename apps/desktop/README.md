# Desktop app (`@paper-engineering-assistant/desktop`)

Electron + React + Vite + TypeScript desktop shell for the research workflow UI.

## Commands

- `pnpm --filter @paper-engineering-assistant/desktop dev`
- `pnpm --filter @paper-engineering-assistant/desktop typecheck`
- `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
- `pnpm --filter @paper-engineering-assistant/desktop build`
- `pnpm --filter @paper-engineering-assistant/desktop start`

## Notes

- Renderer imports shared UI styles from `ui/styles/ui.css`.
- Default theme mode is `system` (follows OS light/dark preference on first launch).
- Theme mode switch is available in the top-right header: `跟随系统 / 浅色 / 深色`, with local persistence.
- Main/preload follow secure defaults (`contextIsolation` + sandbox + preload bridge).
- Dev server binds to `127.0.0.1` and auto-selects an available port starting from `5173` (override base with `DESKTOP_DEV_PORT`).
- Dev bootstrap compiles `tsconfig.main.json` before launching Electron to keep main/preload runtime artifacts in sync.
- DevTools is off by default; set `DESKTOP_OPEN_DEVTOOLS=1` when you want it to auto-open.
- App window starts hidden in dev; click the Dock/desktop app icon to reveal and focus it at screen center.
- On app activate, window is explicitly focused and brought to top to ensure immediate interaction.
- Governance panel feature flag:
  - `VITE_ENABLE_GOVERNANCE_PANELS=1` to enable by default.
  - 默认关闭；也可在 UI 内按会话临时启用/关闭。
- Backend integration:
  - Electron main proxy target: `DESKTOP_BACKEND_BASE_URL` (default `http://127.0.0.1:3000`).
  - Renderer direct fallback target (when bridge unavailable): `VITE_API_BASE_URL`.
