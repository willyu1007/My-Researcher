# Phase 4B database target

- SSOT mode: `repo-prisma` from `docs/project/db-ssot.json`.
- Direction: repository Prisma schema and versioned migration to database.
- Authorized apply target: nonce-derived, marker-verified disposable PostgreSQL only.
- Explicitly excluded: named-local, staging, production, shared development database, backfill and repair.
- Credentials are generated for the disposable container and are not recorded in task evidence.
