# Named-local migration plan

## Target and authority

- Explicitly authorized named-local development target only: `127.0.0.1:5432/postgres`, schema `my_researcher_dev`.
- Strategy: versioned `prisma migrate deploy`; never `migrate dev` or `db push`.
- Destructive schema/data changes: none in the reviewed SQL.

## Recovery point

Create a PostgreSQL 17 custom-format dump under `.ai/.tmp/db-recovery/`, record its byte size and SHA-256, and verify its table of contents with PostgreSQL 17 `pg_restore --list` before deploy. The dump is gitignored operational recovery material and should be retained until T-135 named-local post-verification is accepted.

## Apply and verify

1. Run `prisma migrate deploy` with `.env.local`.
2. Require `prisma migrate status` to report all 75 migrations applied.
3. Verify all ten new tables, the semantic HNSW index and 3072-dimensional vector column in `my_researcher_dev`.
4. Refresh the generated DB context and run the repository database suite.
5. Do not enable any T-134/T-135 capability as part of migration apply.
