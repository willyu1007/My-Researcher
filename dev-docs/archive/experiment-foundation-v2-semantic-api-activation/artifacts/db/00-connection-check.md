# Named-local connection check

Checked on 2026-08-03 before any database write.

- SSOT mode: `repo-prisma`; schema source is `prisma/schema.prisma`.
- Target class: local development only.
- Target identity: loopback PostgreSQL `127.0.0.1:5432`, database `postgres`, schema `my_researcher_dev`.
- Server/client: PostgreSQL 17.7 server and PostgreSQL 17.7 `pg_dump`/`pg_restore` binaries.
- pgvector: version 0.8.1 is installed and available.
- Migration status: 75 migrations in the repository; exactly four T-134 migrations pending.
- No connection URL, password or credential value was recorded.
