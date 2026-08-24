# My-Researcher

Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows.

## Run locally

Requires Node.js and pnpm.

```bash
pnpm install
pnpm desktop:dev
```

For the Prisma-backed backend:

```bash
pnpm backend:dev:prisma:setup
pnpm backend:dev:prisma
```

`desktop:dev` reuses this project's Fastify health endpoint on `127.0.0.1:3000`; when that port
belongs to another process it selects an available port from `3310` and passes the URL to Electron.
Use `DESKTOP_BACKEND_BASE_URL` or `VITE_API_BASE_URL` to attach to an existing backend.

## Authorities

| Concern | Entry point |
|---|---|
| Repository boundaries | `AGENTS.md` |
| Desktop | `apps/desktop/README.md` |
| Backend | `apps/backend/README.md` |
| Product/API/DB/UI context | `docs/context/INDEX.md` |
| LLM configuration | `.ai/llm/AGENTS.md` |
| Prisma migrations | `prisma/migrations/AGENTS.md` |
| Task records | `dev-docs/AGENTS.md` |
| Project status | `.ai/project/dashboard.md` |

## Checks

```bash
pnpm typecheck
pnpm test
pnpm llm:config:check
pnpm db:context:check
node .ai/scripts/ctl-project-governance.mjs lint
```
