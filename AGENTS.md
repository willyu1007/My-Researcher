# My-Researcher repository rules

My-Researcher is a local-first desktop assistant for CS paper engineering with reviewer-aligned
evidence workflows.

## Authorities

| Concern | Authority |
|---|---|
| Current desktop runtime | `apps/desktop/` |
| Backend and LLM consumers | `apps/backend/` |
| Product/API/DB/UI context | `docs/context/INDEX.md` |
| Historical initialization | `docs/project/overview/START-HERE.md` |
| LLM configuration | `.ai/llm/AGENTS.md` |
| Prisma migrations | `prisma/migrations/AGENTS.md` |
| Task records | `dev-docs/AGENTS.md` |
| Project graph | `.ai/project/AGENTS.md` |

Repository scripts use `.mjs` ESM.

## Desktop UI

- Runtime styles enter through `ui/styles/ui.css`. Do not recreate
  `apps/desktop/src/renderer/styles/**` or `apps/desktop/src/renderer/app-layout.css`.
- Remaining selectors under `ui/styles/desktop-runtime/**` are compatibility assets, not a second
  design-system authority.
- Read `docs/context/ui/current-state-alignment.md` before changing composition or visual style.
  Reuse an existing component and `data-ui` contract before extending tokens or primitives.
- A non-trivial new or restructured page, modal, navigation surface, dense panel, or multi-section
  layout requires an approved standalone HTML mock. Copy, data-authority, and bounded
  compatibility fixes do not.

## LLM runtime

- `.ai/llm/**` owns shipped provider connections, feature model routes, native parameters, tool
  declarations, and production Prompt bodies.
- Keep secrets, dynamic payloads, output schemas, retries, telemetry, admission, and safety checks
  in their existing typed runtime owners. Do not create a second hardcoded configuration source.
- The backend currently consumes `.ai/llm` from the repository root. A standalone package must
  include the directory at its application root or provide an explicit loader root.

## Database

- `prisma/schema.prisma` is the persisted-schema source of truth; migrations originate here.
- Business code uses repository interfaces rather than importing Prisma.
- Keep `docs/context/db/schema.json` aligned with Prisma; `pnpm db:context:check` verifies its
  primary/unique flags against the generated Prisma DMMF.
- Migration naming and disposable-shadow-DB rules live in `prisma/migrations/AGENTS.md`.
