# 03 Execution Log
[apply] prisma migrate deploy
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

1 migration found in prisma/migrations

Applying migration `20260222120000_init_research_lifecycle`

The following migration(s) have been applied:

migrations/
  └─ 20260222120000_init_research_lifecycle/
    └─ migration.sql
      
All migrations have been successfully applied.
[info] deploy-exit-code=0

[verify] prisma migrate status (post)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

1 migration found in prisma/migrations

Database schema is up to date!
[info] post-status-exit-code=0

[verify] list tables by prisma db execute
Script executed successfully.
[info] table-query-exit-code=0
