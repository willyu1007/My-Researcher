# Architecture

## Context and current state
`PrismaLiteratureEmbeddingStore.writeEmbeddingRetrievalVectors` currently opens an interactive Prisma transaction and awaits one raw `UPDATE` per chunk. Prisma's default five-second transaction window expired while materializing the reproduced 205-chunk `LIT-2297` artifact, even though smaller batches completed. The embedding artifact is the reusable provider-result owner; native pgvector columns are a materialized retrieval projection consumed after the artifact is ready.

## Settled design and boundaries
- Validate every input vector with the existing configured-dimension guard and convert it to the existing pgvector literal before issuing any write.
- Escape the chunk ID, vector literal, and normalized timestamp with the repository's existing SQL string helper.
- Persist the complete record set in one PostgreSQL `UPDATE ... FROM (VALUES ...)` statement through the root Prisma client, outside an interactive transaction.
- Return the database's affected-row count unchanged so the materializer's existing expected-count invariant remains authoritative.
- Keep the empty-input fast path and all artifact, processing-run, indexing, activation, telemetry, and provider-routing behavior unchanged.

The correction intentionally removes the time-bounded serial transaction rather than increasing its timeout. It does not introduce batching configuration, a new repository abstraction, or a second vector authority.

## Interfaces and contracts
The public repository contract remains:

```ts
writeEmbeddingRetrievalVectors(input: {
  records: Array<{
    embeddingChunkId: string;
    normalizedVector: number[];
    updatedAt: Date;
  }>;
}): Promise<number>
```

The returned number is the exact rows updated by PostgreSQL. Dimension-invalid input fails before the statement is executed. Callers continue to reject incomplete materialization when this count differs from the expected chunk count.

## Migration and operation
No schema or data migration is required. Existing successful vectors remain unchanged. Recovery reuses the persisted EMBEDDINGS artifact and rematerializes all native vectors idempotently before indexing. A recovery that cannot prove artifact reuse is not authorized to call the provider and must stop with the failed owner intact.
