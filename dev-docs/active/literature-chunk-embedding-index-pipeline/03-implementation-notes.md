# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for chunking, embedding, indexing, and active version replacement.
- 2026-05-05: Added DB SSOT migration `20260505143000_add_literature_embedding_lifecycle` for embedding version lifecycle fields and per-chunk type/source-ref/metadata/checksum fields.
- 2026-05-05: Replaced placeholder chunking with stable flat classified chunks from abstract, fulltext sections/paragraphs, and semantic dossier categories.
- 2026-05-05: Removed `local-hash-embedding-v1` from the normal embedding path. Missing OpenAI embedding config now blocks `EMBEDDED` instead of silently producing fake vectors.
- 2026-05-05: Changed lifecycle so `EMBEDDED` writes one `READY` inactive version and `INDEXED` indexes/activates that same version only after smoke checks pass.
- 2026-05-05: Quality pass removed the old embedding mapping backfill script/package entry, removed the dormant `activate=true` version snapshot path, and bound `INDEXED` activation to matching chunk/embedding artifact checksums. Stale index rebuild now replaces token-index rows on the active matching version instead of appending duplicates.

## Open Decisions
- Still deferred to later tuning/cutover: local ANN engine, larger-corpus index parameters, and old-version retention/cleanup policy.
- Closed for v1: deterministic chunk IDs/checksums use source payload checksums and flat chunk metadata; no physical hierarchy is introduced.
