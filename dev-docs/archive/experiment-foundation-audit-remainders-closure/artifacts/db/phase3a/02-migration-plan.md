# Phase 3A Migration Plan

1. Validate and format the repo Prisma SSOT.
2. Apply the complete versioned migration history to a fresh nonce-bound disposable pgvector database.
3. Execute the relational crash, replay, concurrency, CAS and durable-tamper suite with skip disabled.
4. Reset/replay the same disposable target through the Prisma drift gate.
5. Remove the container in all success or failure paths.

No named database apply, backfill, repair or destructive product-data operation is authorized.
