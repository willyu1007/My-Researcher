# Phase 4B migration plan

1. Update `prisma/schema.prisma` as the persistence SSOT.
2. Add one reviewed versioned SQL migration with explicitly pinned names shorter than PostgreSQL's 63-byte limit.
3. Run Prisma format/validate and inspect the migration SQL before any database execution.
4. Apply the complete migration history only to an identity-fenced disposable pgvector database.
5. Verify table constraints, indexes, atomic project replacement and cross-project isolation.
6. Refresh `docs/context/db/schema.json` from the Prisma SSOT.

Rollback before runtime exposure is code rollback plus stopping the uncomposed indexer. Projection rows are rebuildable and contain no authority; structured lineage remains unchanged and complete.
