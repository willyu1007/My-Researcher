# 02 Architecture

## Boundaries
- Main process: Electron app lifecycle, window creation, secure IPC bridge.
- Preload: constrained API surface for renderer.
- Renderer: React + Vite app, consuming UI tokens/styles and shared contracts.
- Shared/UI SSOT: `ui/*` and `docs/context/ui/ui-spec.json`.

## Key interfaces
- `window.desktopApi` (preload exposed methods, typed)
- Renderer route shell (`Home`, `Research Workspace`, `Settings` placeholder)
- Theme switch entry (`morethan.light` default; dark optional)

## Data flow
- Local-first renderer state -> IPC request -> main process adapter -> backend/local service (future step).

## Security constraints
- `contextIsolation: true`
- `nodeIntegration: false`
- No direct filesystem access from renderer.
- IPC channels must be explicit and namespaced.
