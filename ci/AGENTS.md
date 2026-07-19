# CI Configuration (LLM-first)

## Commands

```bash
node .ai/skills/features/ci/scripts/ctl-ci.mjs init
node .ai/skills/features/ci/scripts/ctl-ci.mjs init --provider github
node .ai/skills/features/ci/scripts/ctl-ci.mjs init --provider gitlab
node .ai/skills/features/ci/scripts/ctl-ci.mjs add-delivery --provider github
node .ai/skills/features/ci/scripts/ctl-ci.mjs add-delivery --provider gitlab
node .ai/skills/features/ci/scripts/ctl-ci.mjs verify
node .ai/skills/features/ci/scripts/ctl-ci.mjs status
pnpm ci:prisma-smoke -- --base-url postgresql://postgres:postgres@127.0.0.1:5432/postgres
pnpm ci:prisma-drift -- --shadow-url "postgresql://$USER@127.0.0.1:5432/drift_shadow_tmp"  # disposable DB only — it gets RESET (createdb/dropdb flow: prisma/migrations/AGENTS.md)
```

## Guidelines

- Track CI metadata in `ci/config.json`.
- Edit provider files directly (e.g., `.github/workflows/`, `.gitlab-ci.yml`).
- `ci:prisma-drift` replays `prisma/migrations` onto a shadow DB and fails on any
  diff vs `schema.prisma`. The shadow DB is RESET — disposable databases only,
  and the server needs pgvector. Migration naming rules: `prisma/migrations/AGENTS.md`.
