# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for `KEY_CONTENT_READY` semantic dossier extraction.
- 2026-05-05: Implemented `key_content.v1` / `paper_semantic_dossier.v1` shared runtime contract and added `KEY_CONTENT_DOSSIER` as the persisted pipeline artifact type.
- 2026-05-05: Added OpenAI extraction settings that reuse the redacted provider secret, with `default` = `gpt-5-mini` and `high_accuracy` = `gpt-5.2`.
- 2026-05-05: Added `LiteratureKeyContentExtractionService` with section-level OpenAI Structured Outputs calls, source-ref validation against abstract/fulltext refs, display digest generation, and preservation of `user_edited` dossier entries.
- 2026-05-05: Updated `KEY_CONTENT_READY` so readiness is based on the dossier artifact/stage status, not `LiteratureRecord.keyContentDigest`.
- 2026-05-05: Quality pass tightened display-digest semantics: editing `keyContentDigest` no longer marks semantic dossier/chunk/embedding/index stages stale, and desktop intake labels it as a display short digest instead of retrieval input.

## Open Decisions
- Closed for v1: runtime validation is implemented in the service with a strict OpenAI JSON Schema payload and targeted unit coverage.
- Closed for v1: extraction prompt/profile ownership sits in `LiteratureKeyContentExtractionService` plus literature content-processing settings.
