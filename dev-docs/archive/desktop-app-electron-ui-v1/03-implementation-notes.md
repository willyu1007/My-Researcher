# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## What changed
- Created task bundle `desktop-app-electron-ui-v1` with roadmap and task packages.
- Added project governance mapping:
  - `F-002`: Desktop Frontend Foundation
  - `R-002`: Electron desktop scaffold and brand UI landing
  - `T-004` mapped to `M-001/F-002/R-002`
- Added brand themes from `/Volumes/DataDisk/Data/LOGO`:
  - `ui/tokens/themes/morethan.light.json`
  - `ui/tokens/themes/morethan.dark.json`
- Ran UI codegen/validate and refreshed generated artifacts:
  - `ui/styles/tokens.css`
  - `docs/context/ui/ui-spec.json`
- Added style-intake evidence bundle:
  - `.ai/.tmp/ui/20260222-132500-morethan-style-intake/`
- Scaffolded desktop app at `apps/desktop`:
  - Electron main/preload (secure defaults + IPC bridge)
  - React + Vite renderer
  - Brand assets and first shell UI
- Updated root scripts:
  - `desktop:dev`
  - `desktop:typecheck`
  - `desktop:build`
- Updated CI workflow:
  - Added `desktop-checks` job
  - `prisma-smoke` now depends on `backend-checks` and `desktop-checks`
- Hardened desktop local dev startup orchestration:
  - `apps/desktop/package.json` `dev` now uses `node scripts/dev.mjs`
  - Added `apps/desktop/scripts/dev.mjs` to start Vite with strict port and automatic retry from `DESKTOP_DEV_PORT` (default `5173`)
  - Added startup stabilization + readiness checks to avoid immediate exit on port contention
  - Electron child process now clears inherited `ELECTRON_RUN_AS_NODE` to prevent accidental Node-only execution
  - Unified dev host as `127.0.0.1` (renderer bind + `VITE_DEV_SERVER_URL`) to prevent `localhost` resolving to `::1` and accidentally loading another project's Vite page
- Fixed desktop white-screen runtime fault:
  - Root cause: preload script load failed in dev (`preload.js`/`preload.ts` mismatch + ESM preload incompatibility), causing `window.desktopApi` undefined and renderer crash at `App.tsx`.
  - Added CJS preload bridge at `apps/desktop/src/main/preload.cjs`.
  - Updated preload resolution in `apps/desktop/src/main/main.ts` to prefer `preload.cjs`.
  - Updated `apps/desktop/scripts/dev.mjs` to compile main/preload and launch `electron dist/main/main.js`.
  - Added renderer fallback in `apps/desktop/src/renderer/App.tsx` when desktop bridge metadata is unavailable.
  - Fixed CSS import order in `ui/styles/ui.css` to remove Vite import-order warnings.
- Updated dev startup behavior to avoid auto popup:
  - `apps/desktop/src/main/main.ts` now opens DevTools only when `DESKTOP_OPEN_DEVTOOLS=1`.
  - Default dev startup no longer auto-opens detached DevTools window.
- Updated dev window reveal behavior for non-intrusive startup:
  - `apps/desktop/src/main/main.ts` creates the main window with `show: false` and `center: true`.
  - Main window is shown/focused/centered only on app `activate` (e.g., user clicks the app icon).
  - `mainWindow` lifecycle now tracks `closed` to keep activate behavior stable.
- Improved interactive readiness after reveal:
  - `focusAndCenterWindow` now calls `app.focus({ steal: true })`, `window.moveTop()`, and `window.webContents.focus()` to avoid non-interactive foreground windows.
  - Added visible click feedback in `apps/desktop/src/renderer/App.tsx`:
    - module buttons switch active state
    - action buttons update footer hint text
- Added desktop E2E smoke script:
  - `apps/desktop/scripts/smoke-e2e.mjs`
  - `apps/desktop/package.json` script `smoke:e2e`
  - Smoke flow covers backend startup, paper seed, desktop dev startup, renderer probe, and governance read/review API chain.

## Decisions & tradeoffs
- Decision: Use Electron instead of Tauri for first implementation.
  - Rationale: Faster integration with existing TypeScript/Node stack and backend contracts.
  - Alternatives considered: Tauri (smaller footprint, higher integration complexity at current stage).
- Decision: Apply brand style via token themes only, without contract expansion.
  - Rationale: Existing data-ui roles already cover current UI shell requirements.
  - Alternatives considered: contract role extension; rejected to avoid unnecessary drift.
- Decision: Add desktop CI check as typecheck + renderer build (not full Electron runtime smoke).
  - Rationale: CI runner lacks GUI context; static validation gives stable baseline signal.
  - Alternatives considered: headless runtime smoke; higher setup complexity for first pass.

## Known issues / follow-ups
- Pending: 若后续需要视觉回归基线，可新增截图快照自动化（当前已完成命令级 E2E 冒烟）。
