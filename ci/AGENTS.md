# CI Configuration

## Commands

```bash
node .ai/scripts/ctl-project-governance.mjs lint --strict
pnpm ci:prisma-smoke -- --base-url postgresql://postgres:postgres@127.0.0.1:5432/postgres
pnpm ci:prisma-drift -- --shadow-url "postgresql://$USER@127.0.0.1:5432/drift_shadow_tmp"  # disposable DB only — it gets RESET (createdb/dropdb flow: prisma/migrations/AGENTS.md)
```

## Guidelines

- Edit provider workflows directly under `.github/workflows/`.
- `ci:prisma-drift` replays `prisma/migrations` onto a shadow DB and fails on any
  diff vs `schema.prisma`. The shadow DB is RESET — disposable databases only,
  and the server needs pgvector. Migration naming rules: `prisma/migrations/AGENTS.md`.
