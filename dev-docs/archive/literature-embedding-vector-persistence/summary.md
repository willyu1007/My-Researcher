# Literature embedding vector persistence

## Goal and background

T-149 closed T-148 FIND-008. A replacement-topic paper with 205 chunks exhausted Prisma's default five-second interactive-transaction window because native pgvector values were written serially after the reusable embedding artifact had already been created.

## Outcome

- `PrismaLiteratureEmbeddingStore.writeEmbeddingRetrievalVectors` now validates the full input and persists it with one PostgreSQL `UPDATE ... FROM (VALUES ...)` statement outside an interactive transaction.
- The repository contract still returns PostgreSQL's exact affected-row count, retains the empty-input fast path, and preserves existing vector-dimension validation.
- The original `LIT-2297` owner recovered 205 native vectors, indexed successfully, and became topic-active by reusing the existing embedding artifact. Recovery made no additional embedding-provider request.
- T-148 records the original real-flow failure as closed. Implementation and regression coverage landed in commit `e1cb43c3`.

## Durable decisions

- Remove the size-sensitive serial transaction rather than increasing its timeout. A timeout increase would retain linear per-chunk transaction overhead and another batch-size failure point.
- Treat the provider embedding artifact as the reusable result authority and native pgvector columns as a materialized retrieval projection.
- Preserve the existing caller invariant that rejects incomplete materialization when the affected-row count differs from the expected chunk count.
- No schema migration, new persistence abstraction, chunking-policy change, retrieval-ranking change, or provider-routing change belongs to this repair.

## Relationships and boundaries

- T-148 owns the broader topic-selection real-flow findings and consumes this task's closed FIND-008 disposition.
- T-150 consumes the resulting indexed, evidence-ready library but does not own or alter this persistence implementation.
- The focused regression proves the reproduced 205-chunk case. Substantially larger batches remain outside this task's acceptance boundary and should be evaluated from new evidence rather than inferred from this incident.
