# Desktop UI current-state alignment

## Users and tasks

The primary user is a CS researcher or paper author working locally. The desktop UI supports one
continuous job: collect and inspect literature, narrow a research topic, plan and review experiments,
trace results to evidence, make explicit human-gate decisions, and prepare bounded paper content.
Operator-facing settings exist to choose provider profiles and inspect workflow/runtime state, but
the renderer does not own backend research decisions or persisted authority.

When changing a surface, name the user task and the decision or action it enables. Avoid adding a
new visual abstraction solely to mirror backend structure.

## Consumed visual authority

- The shell is Electron; the renderer is React, Vite, and TypeScript.
- `apps/desktop/src/renderer/main.tsx` imports the single global entrypoint
  `ui/styles/ui.css`.
- That entrypoint loads `tokens.css`, `contract.css`, and
  `desktop-runtime/index.css` in runtime order.
- `tokens.css` owns the currently consumed color, typography, spacing, radius, shadow, motion,
  sizing, and z-index values.
- `contract.css` owns reusable `data-ui` primitives and state/variant selectors.
- Feature components under `apps/desktop/src/renderer/**` own task composition.
- `desktop-runtime/**` owns compatibility selectors for existing shell, literature, topic,
  experiment, paper-implementation, and writing surfaces until those surfaces are explicitly
  refactored.
- Theme selection remains `system | light | dark`, resolved to
  `morethan.light | morethan.dark` through `document.documentElement[data-theme]`.
- The former renderer-local `app-layout.css` and `styles/**` paths remain retired.

The required reuse order is: reuse an existing component and `data-ui` contract; extend the current
contract or tokens when the same concept needs a real variant; create a new primitive only when the
existing system cannot express the user task. Do not bypass tokens with inline styles or raw colors.

## Icons and accepted deviations

There is no canonical icon component or icon-library contract today. Five renderer TSX files contain
local inline SVGs. They are an accepted compatibility deviation, not a pattern to expand casually:
reuse an adjacent established icon when it has the right meaning, keep accessibility labeling intact,
and choose any future canonical icon set as a separately scoped UI-system decision.

`desktop-runtime/**` and the three top-level CSS files are maintained runtime snapshots rather than a
promise that a future full UI rewrite must preserve their internal design-system model. Within the
current UI, however, they are the consumed authority and should remain internally consistent.

## Change gate

A non-trivial new or restructured page, modal, navigation surface, dense panel, or multi-section
layout requires a standalone static HTML mock and user approval before production implementation.
Keep that review artifact outside the repository unless it is intentionally becoming maintained
product documentation. Copy changes, backend-driven label/data fixes, and small local compatibility
repairs that do not alter composition or visual language do not require a mock.

## Verification

- Confirm the renderer still imports only `ui/styles/ui.css`.
- Confirm `apps/desktop/src/renderer/app-layout.css` and
  `apps/desktop/src/renderer/styles/**` remain absent.
- Audit changed TSX for inline styles, raw colors, and unnecessary new primitives.
- Run `pnpm desktop:typecheck` after UI-boundary or renderer changes.

Current positive controls on 2026-08-24: 2,076 `data-ui` uses and 741 `var(--ui-...)` uses; renderer
TSX contains no `style={{...}}` and no raw hex colors.
