# 03 Implementation Notes

## 2026-06-04 - Task Created
- Project-orchestrator decision: `NEW_TASK`.
- Rationale: no existing task owns pgvector migration or vector-index retrieval design; T-120 only recorded the retrieval-scale risk.
- Created T-121 as a design and migration-preparation task.
- Current confirmed facts:
  - `prisma/schema.prisma`: `LiteratureEmbeddingChunk.vector` is `Json`.
  - DB `information_schema`: `LiteratureEmbeddingChunk.vector` is `jsonb`.
  - DB `pg_extension`: no `vector` extension installed.
  - Repository path: `PrismaLiteratureEmbeddingStore.listEmbeddingChunksByEmbeddingVersionIds` loads matching chunks through Prisma `findMany`.
  - Service path: `LiteratureRetrievalService.retrieve` computes vector similarity in TypeScript.
- Scope decision:
  - This task records and designs the pgvector path.
  - It does not apply DB schema changes yet.

## Recommended Direction
- Use pgvector as the future retrieval substrate to avoid late migration pain.
- Keep the migration additive:
  - retain JSONB vector as rollback/parity data.
  - add native vector storage and index.
  - dual-write during the cutover window.
  - switch retrieval reads only after parity and performance evidence.
- Do not jump directly to deleting JSONB vectors; that would create unnecessary rollback risk.
