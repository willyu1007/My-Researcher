# 02 Architecture

## Execution Model
- Durable batch jobs fan out into per-literature runs or run groups.
- Same explicit content-processing chain as single-item processing.
- No partial index activation.

## Controls
- Conservative local defaults.
- Separate concurrency for parser/OCR/LLM and embedding.
- Provider backoff for quota, timeout, 429, and 5xx errors.

## Cleanup
- Retain superseded versions for rollback.
- Never delete active embedding version.
- Do not remove raw source files during embedding cleanup.

## DB Boundary
- Durable batch jobs likely need persisted tables; decide through DB SSOT during detailed task planning.
