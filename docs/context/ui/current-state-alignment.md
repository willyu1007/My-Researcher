# Desktop UI current-state alignment

## Current runtime facts

- The desktop shell is Electron; the renderer is React, Vite, and TypeScript.
- `apps/desktop/src/renderer/main.tsx` imports the single global entrypoint
  `ui/styles/ui.css`.
- That entrypoint loads `tokens.css`, `contract.css`, and
  `desktop-runtime/index.css` in runtime order.
- Theme selection remains `system | light | dark`, resolved to
  `morethan.light | morethan.dark` through `document.documentElement[data-theme]`.
- The former renderer-local `app-layout.css` and `styles/**` paths remain retired.

## Compatibility boundary

`ui/styles/desktop-runtime/**` still powers the shell, literature overview, auto import, manual
import, and paper/writing surfaces. The repository-governance migration deliberately preserves
those selectors and makes no visual changes.

The old approval, codegen, JSON token, JSON contract, pattern, and UI-gate machinery has been
retired. The three top-level CSS files are now maintained runtime snapshots, not a commitment that
a future full UI refactor must preserve their design-system model.

## Verification

- Confirm the renderer still imports only `ui/styles/ui.css`.
- Confirm `apps/desktop/src/renderer/app-layout.css` and
  `apps/desktop/src/renderer/styles/**` remain absent.
- Run `pnpm desktop:typecheck` after UI-boundary changes.
