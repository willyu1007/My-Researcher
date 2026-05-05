# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for local content assets and `FULLTEXT_PREPROCESSED` replacement.
- 2026-05-05: Closed DB boundary through Prisma SSOT with `LiteratureContentAsset`, `LiteratureFulltextDocument`, `LiteratureFulltextSection`, `LiteratureFulltextParagraph`, and `LiteratureFulltextAnchor`.
- 2026-05-05: Added `POST /literature/:literatureId/content-assets` and `GET /literature/:literatureId/content-assets` for explicit local raw asset registration and listing.
- 2026-05-05: Replaced metadata-string placeholder fulltext preprocessing with asset-backed text/markdown parsing.
- 2026-05-05: `FULLTEXT_PREPROCESSED` now requires a registered `raw_fulltext` asset; missing assets and unsupported PDF/OCR cases return `BLOCKED` with diagnostics.
- 2026-05-05: v1 parser persists normalized text, sections, paragraphs, offsets, checksums, and diagnostics; figure/table/formula/OCR/layout extraction is explicitly reported unavailable rather than silently fabricated.
- 2026-05-05: Post-implementation quality review added durable read methods for fulltext anchors, Markdown figure/table/formula anchor extraction, strict readable-file checksum/byte-size validation, and test temp-directory cleanup.

## Resolved Decisions
- v1 parser supports plain text and Markdown only.
- PDF/OCR/layout extraction is deferred until a concrete parser/OCR provider is selected.
- Structured fulltext data is stored in normalized tables; the `PREPROCESSED_TEXT` artifact remains as the read-side pipeline artifact for downstream chunking.
