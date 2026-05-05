# 03 Implementation Notes

- 2026-05-05: Task package created to close the five post-review findings from the content-processing landing pass.
- 2026-05-05: Public backfill item contract renamed the exposed run id to `content_processing_run_id`; shared DTO, backend mapping, desktop normalizer, OpenAPI, and API index were updated. Product-path search for the removed field name returns zero matches.
- 2026-05-05: Retrieval now resolves the configured active embedding profile first, filters active embedding versions by provider/model/profile/dimension, embeds the query once, and reports skipped inactive profiles instead of mixing vector spaces.
- 2026-05-05: Added storage-root-backed file materialization for content-processing outputs. New runs write normalized text and preprocessed manifests under configured/effective roots and keep DB path/checksum refs.
- 2026-05-05: Added Prisma migration for `LiteratureFulltextDocument.normalizedTextPath`, `parserArtifactPath`, `parserArtifactMimeType`, nullable `normalizedText`, and `LiteraturePipelineArtifact.payloadPath`. Existing inline `normalizedText` rows remain readable.
- 2026-05-05: Added configurable GROBID endpoint, settings health check route, and desktop settings controls showing endpoint, health, and effective storage roots. Health checks try `/api/health` with `/api/isalive` fallback.
- 2026-05-05: PDF `FULLTEXT_PREPROCESSED` now calls GROBID `processFulltextDocument`, stores TEI XML as parser artifact, derives normalized text, sections, paragraphs, anchors, and layout bbox refs. GROBID down maps to `FULLTEXT_PARSER_UNAVAILABLE`; no-text/scanned PDFs map to `FULLTEXT_OCR_REQUIRED`.
- 2026-05-05: `KEY_CONTENT_READY` now runs section extraction followed by a paper-level consolidation pass that deduplicates/canonicalizes model-generated items before preserving user-edited items.
