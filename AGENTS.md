# AI Assistant Instructions

**paper-engineering-assistant** - Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows.

## Project Type

paper-engineering-assistant - Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows.

## Tech Stack

| Category | Value |
|----------|-------|
| Language | typescript |
| Package manager | pnpm |
| Repo layout | monorepo |
| Frontend | react |
| Backend | fastify |
| Database | postgres |
| API style | rest |

## Key Directories

| Directory | Purpose | Entry Point |
|-----------|---------|-------------|
| `apps/` | Applications | - |
| `packages/` | Shared packages | - |
| `docs/project/overview/` | Initialization archive and project baseline decisions | `docs/project/overview/START-HERE.md` |
| `docs/context/` | LLM-readable contracts (API/DB/process/UI) | `docs/context/INDEX.md` |
| `.ai/` | Runtime LLM configuration and project governance | `.ai/llm/AGENTS.md`, `.ai/project/AGENTS.md` |
| `dev-docs/` | Complex task documentation | `dev-docs/AGENTS.md` |

## Routing

| Task Type | Entry Point |
|-----------|-------------|
| **First time / Project setup** | `README.md` |
| **Initialization decisions / baseline** | `docs/project/overview/START-HERE.md` |
| **Project progress governance** | `.ai/project/AGENTS.md` |
| **LLM provider/model/prompt configuration** | `.ai/llm/AGENTS.md` |
| **Complex task documentation** | `dev-docs/AGENTS.md` |

## Global Rules

- Follow progressive disclosure: read only the file you are routed to.

## Task Continuity

- For a request that continues an existing task, run
  `node .ai/scripts/ctl-project-governance.mjs resume` before reading implementation files.
- If the request identifies `T-###`, pass it with `--task T-###`.
- Treat a task ID in the current branch as relevant only when the request concerns that task.
- For unrelated work, do not run task recovery or attach a `Task:` trailer. On a task branch, set
  `SKIP_TASK_TRAILER=1` for that commit.
- Session creation, reset, and compaction are controlled by the user or runtime. Continue working
  without discussing session-control limitations.

## Coding Standards (RECOMMEND)

- **ESM (.mjs)**: All scripts in the repository use ES Modules with `.mjs` extension. Use `import`/`export` syntax, not `require()`.

## Coding Workflow (MUST)

- Before modifying code/config for a non-trivial task, apply the Decision Gate in `dev-docs/AGENTS.md` and create/update the dev-docs task bundle as required.
- If a task needs context preservation, handoff, or durable cross-cutting decisions, follow
  `dev-docs/AGENTS.md`; otherwise keep planning in the current conversation.

## Desktop UI Boundary (MUST)

- The former `apps/desktop/src/renderer/styles/**` legacy compatibility layer is retired.
- Do not recreate `apps/desktop/src/renderer/styles/**` or `apps/desktop/src/renderer/app-layout.css`.
- Desktop runtime styles load through `ui/styles/ui.css`; any remaining compatibility selectors live under `ui/styles/desktop-runtime/**` until their owning UI surfaces are rewritten.
- Treat the current runtime styles as compatibility assets, not as a permanent design-system
  commitment. Replace them only inside an explicitly scoped UI refactor.
- Ground UI work in the researcher task being changed and read
  `docs/context/ui/current-state-alignment.md` before changing composition or visual style.
- Reuse an existing component and `data-ui` contract first, extend the current contract/tokens
  second, and create a new visual primitive only when neither can express the task.
- Before implementing a non-trivial new or restructured page, modal, navigation surface, dense
  panel, or multi-section layout, create a standalone static HTML mock and obtain user approval.
  Copy changes, data-authority fixes, and small local compatibility repairs do not require a mock.

## LLM Runtime Configuration (MUST)

- `.ai/llm/**` owns shipped provider connections, feature model routes, provider-native parameters,
  tool declarations, and production prompt bodies. Read `.ai/llm/AGENTS.md` before changing them.
- Secret values never belong in `.ai/llm`; configuration may name environment variables only.
- Keep dynamic user payloads, output schemas, retries, telemetry, admission, and safety checks in
  typed runtime code. Do not create a second hardcoded authority for configured values.
- The repository carries no agent skill packs. Do not restore `.codex/skills`, `.claude/skills`,
  or feature-specific agent execution mechanisms under `.ai`.

## Workspace Safety (MUST)

- NEVER create/copy/clone this repository into any subdirectory of itself (no nested repo copies).
- Create throwaway test repos **outside** the repo root (OS temp or a sibling directory) and delete them after verification.
- Keep temporary workspaces shallow: if a path is getting deeply nested or has exceeded **12 path segments** total;, stop and clean up instead of continuing.

<!-- DB-SSOT:START -->
## Database SSOT and schema synchronization

**Mode: repo-prisma** (SSOT = `prisma/schema.prisma`)

- DB context contract (LLM-first): `docs/context/db/schema.json`
- If you change persisted fields or tables, update `prisma/schema.prisma`, create the matching
  migration, and validate the repository-to-database direction before applying it.
- If you need to mirror an external DB: do NOT; this mode assumes migrations originate in the repo.

Rules:
- Business layer MUST NOT import Prisma (repositories return domain entities).
- Keep `docs/context/db/schema.json` aligned when the Prisma schema changes.
<!-- DB-SSOT:END -->
