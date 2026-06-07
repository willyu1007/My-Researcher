# 00 Connection Check

## Status
- Completed.
- DB SSOT mode: `repo-prisma`.
- Prisma schema SSOT: `prisma/schema.prisma`.
- DB context contract: `docs/context/db/schema.json`.

## Commands
- `cat docs/project/db-ssot.json`
- `node .ai/skills/features/database/db-human-interface/scripts/ctl-db-doc.mjs status`
- `set -a; . ./.env.local; set +a; pnpm exec prisma validate --schema prisma/schema.prisma`

## Result
- `docs/project/db-ssot.json` reports `mode=repo-prisma`.
- DB docs status reports `sourceKind=contract`, `dialect=postgresql`, and `tables=193` before the context refresh.
- Initial `prisma validate` without env failed because `DATABASE_URL` was not loaded.
- `prisma validate` passed after loading `.env.local`.
- No database write was executed.
