# Desktop Renderer Legacy CSS

This directory is the frozen legacy compatibility layer for the desktop renderer.

## Status
- Runtime dependency: yes
- Primary styling path for new UI: no
- Retirement owner: `T-022 desktop-legacy-css-retirement`

## What this layer currently covers
- `shell/*`
- `literature-overview`
- `literature-auto-import/*`
- `literature-manual-import/*`
- `modules-paper-writing.css`
- shared legacy base styles imported through `app-layout.css`

## Rules
- Do not add new modules or new feature surfaces to this layer.
- Do not treat this directory as the default place for desktop UI styling.
- Keep `apps/desktop/src/renderer/app-layout.css` as the only legacy aggregation entry until retirement waves remove imports one by one.
- Only `T-022` and its explicit follow-on migration tasks may modify files in this directory.
- New desktop UI must use the `data-ui` + token/contract path.

## Planned retirement order
1. `shell/*`
2. `modules-paper-writing.css`
3. `literature-overview.css`
4. `literature-auto-import/*`
5. `literature-manual-import/*`
