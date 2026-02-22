# Desktop app (`@paper-engineering-assistant/desktop`)

Electron + React + Vite + TypeScript desktop shell for the research workflow UI.

## Commands

- `pnpm --filter @paper-engineering-assistant/desktop dev`
- `pnpm --filter @paper-engineering-assistant/desktop typecheck`
- `pnpm --filter @paper-engineering-assistant/desktop build`
- `pnpm --filter @paper-engineering-assistant/desktop start`

## Notes

- Renderer imports shared UI styles from `ui/styles/ui.css`.
- Default theme is `morethan.light`.
- Main/preload follow secure defaults (`contextIsolation` + sandbox + preload bridge).
