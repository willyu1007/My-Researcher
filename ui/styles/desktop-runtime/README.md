# Desktop Runtime Compatibility CSS

This directory contains desktop runtime compatibility selectors migrated out of
the former renderer-local legacy CSS path.

## Status
- Runtime dependency: yes
- Primary styling path for new UI: no
- Renderer legacy entry retired by: `T-022 desktop-legacy-css-retirement`

## What this layer currently covers
- `shell/*`
- `literature-overview`
- `literature-auto-import/*`
- `literature-manual-import/*`
- `modules-paper-writing.css`
- shared desktop runtime base styles imported through `ui/styles/ui.css`

## Rules
- Do not add new modules or new feature surfaces to this layer.
- Do not treat this directory as the default place for desktop UI styling.
- Do not recreate `apps/desktop/src/renderer/styles/**` or `apps/desktop/src/renderer/app-layout.css`.
- Prefer deleting or replacing selectors here when a surface is rewritten.
- A future UI refactor may replace the current token/contract CSS rather than inherit it.

## Suggested selector retirement order
1. `shell/*`
2. `modules-paper-writing.css`
3. `literature-overview.css`
4. `literature-auto-import/*`
5. `literature-manual-import/*`
