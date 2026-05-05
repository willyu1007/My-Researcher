# 02 Architecture

## Chunking
- Backend deterministic chunking service.
- No normal LLM boundary selection.
- Flat chunk model with rich metadata.

## Embedding
- OpenAI Embeddings API via provider abstraction.
- Default large profile.
- Query-time embedding handled by retrieve task, not this pipeline task.

## Indexing
- Local vector index, token/BM25 index, metadata filter index.
- Activate only after `INDEXED` succeeds.

## Direct Replacement
- Remove normal use of `local-hash-embedding-v1`.
- Remove simple fixed-length metadata-only chunks as the production path.

## DB Boundary
- Embedding version status and vector/index metadata may require schema changes; decide through DB SSOT during task detail.
