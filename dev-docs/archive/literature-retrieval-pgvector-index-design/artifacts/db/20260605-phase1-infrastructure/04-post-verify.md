# 04 Post Verify

## Implemented
- Additive Prisma schema and migration SQL for native `vector(3072)` retrieval storage.
- Repository contract for:
  - backfill run rows.
  - vector quarantine rows.
  - retrieval vector writes.
  - bounded pgvector candidate query.
- Prisma repository implementation isolates pgvector raw SQL in the embedding store.
- In-memory repository implements matching contract semantics.
- Rollout settings service defaults to `jsonb_only` and rejects invalid one-step transitions.
- Phase 1 preflight script validates disposable pgvector capability.

## Guardrails Verified
- Pgvector candidate SQL filters by service-supplied `eligibleEmbeddingVersionIds`.
- Pgvector candidate SQL does not hard-code `status = 'INDEXED'`.
- Pgvector candidate SQL does not select or return raw JSONB `vector`.
- Retrieval vector writes validate `3072` dimensions before issuing SQL.
- User-visible retrieval route/service was not cut over to pgvector.
- Existing JSONB vector storage remains in place for rollback/parity.

## Remaining Phase Boundaries
- Persistent DB migration apply still needs explicit approval.
- Active corpus backfill is not started.
- Embedding write-path dual-write is not enabled.
- Shadow-read parity is not enabled.
- Canary/default pgvector retrieval is not enabled.
- JSONB cleanup is not started.
