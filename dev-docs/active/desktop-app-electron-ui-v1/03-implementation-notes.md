# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-02-22

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
- Pending: capture first GUI runtime evidence (`pnpm desktop:dev`) on a desktop environment.
- Vite build currently reports non-blocking CSS warning from `ui/styles/ui.css` import order; evaluate whether to reorder shared style entry in a dedicated UI task.
