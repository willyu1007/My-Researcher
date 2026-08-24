# paper-engineering-assistant

Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows.

**Domain:** Computer Science Research

## Repository Status

- Initialization completed on **2026-02-21** (Stage A/B/C approved).
- The historical initialization outputs are archived under `docs/project/overview/`.
- The `init/` workspace is no longer used as an active project entrypoint.

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | typescript |
| Package Manager | pnpm |
| Layout | monorepo |
| Desktop Shell | electron |
| Frontend (Renderer) | react + vite |
| Backend | fastify |
| Database | postgres |
| API | rest |

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd paper-engineering-assistant

# Install dependencies
pnpm install
```

### Development

```bash
# Primary local entrypoint (desktop app + local API)
pnpm desktop:dev

# Prisma-backed backend API against the repo-standard local dev DB
pnpm backend:dev:prisma:setup
pnpm backend:dev:prisma

# Note: root `pnpm dev` is currently a placeholder script.
```

`pnpm desktop:dev` verifies that `127.0.0.1:3000` is this project's Fastify `/health`
endpoint before using it. If that port is occupied by another app, it starts the
backend on an available port starting at `3310` and passes that URL to the
renderer and Electron main process. Override with `DESKTOP_BACKEND_BASE_URL` or
`VITE_API_BASE_URL` when you want to attach to an already-running backend.

## Project Structure

```
apps/
  desktop/         # Electron desktop app (current primary UI)
  backend/         # Backend services
  frontend/        # Placeholder for potential web-only frontend extraction
packages/
  shared/          # Shared libraries
.ai/               # Project hub and governance CLI only
dev-docs/          # Active and archived task bundles
docs/              # Documentation
ops/               # DevOps configuration
```

## Task governance

Durable work is tracked under `dev-docs/` and projected into `.ai/project/`.
The repository does not carry provider-specific skill packs or generated wrappers.

Run `node .ai/scripts/ctl-project-governance.mjs lint --strict` to validate task bundles and
the project hub.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Submit a pull request

## License

[Add your license here]
