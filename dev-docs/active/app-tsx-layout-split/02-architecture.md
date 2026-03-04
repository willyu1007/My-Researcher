# 02-architecture

## Boundaries
- App only orchestrates module routing and shared shell state.
- Literature feature exposes minimal public API via `literature/index.ts`.
- CSS entry `app-layout.css` only aggregates ordered module styles.

## Risks
- Effect dependency drift causing request timing changes
- CSS cascade/order regression
- Excessive prop fan-out

## Controls
- Keep logic copy-move without branch rewrite
- Preserve CSS selector text and load order
- Verify typecheck/build/smoke after each phase
