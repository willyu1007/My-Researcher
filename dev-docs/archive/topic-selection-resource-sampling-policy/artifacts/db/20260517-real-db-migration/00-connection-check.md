# Connection Check

- Date: 2026-05-17
- Target: local development Postgres, current schema `my_researcher_dev`
- Source of truth: `prisma/schema.prisma`
- SSOT mode: `repo-prisma`
- Secret handling: `DATABASE_URL` loaded from `.env.local`; no credentials recorded in this artifact.

## Checks
- `.env.local` exposes `DATABASE_URL`.
- `DATABASE_URL` uses a PostgreSQL URL.
- `prisma validate --schema prisma/schema.prisma` passed before DB writes.

