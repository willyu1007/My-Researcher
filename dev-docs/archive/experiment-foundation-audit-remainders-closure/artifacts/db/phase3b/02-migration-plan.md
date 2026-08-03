# Phase 3B Migration Plan

1. Validate/format the repo Prisma SSOT and generate the client.
2. Apply full migration history to a fresh nonce-bound disposable pgvector database.
3. Run crash, concurrency, replay and durable-tamper relational tests with skip disabled.
4. Compare the actual migrated database with Prisma SSOT and require zero drift.
5. Remove the container in every exit path.

Named database apply, backfill, repair and capability enablement remain unauthorized.
