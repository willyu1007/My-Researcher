# 05 Pitfalls

## Do Not Repeat
- Do not let collection implicitly enqueue content-processing work.
- Do not hide processing behind metadata edits.
- Do not make retrieval depend on non-active or partially written embedding versions.
- Do not introduce DB schema changes without a DB SSOT task.

## Watch Items
- Generic artifact JSON may become hard to query if extraction objects grow.
- Fulltext storage decisions must account for rights and local-first deletion.
- Embedding model/dimension changes must not corrupt existing retrieval results.
