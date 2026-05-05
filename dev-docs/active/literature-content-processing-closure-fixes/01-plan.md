# 01 Plan

## Phase 1 - Contracts and Governance
- Create this task package and sync project governance.
- Rename public backfill run field to `content_processing_run_id`.
- Add `fulltext_parser.grobid.endpoint_url` and health endpoint contracts.

## Phase 2 - Persistence and Storage Roots
- Add Prisma fields for normalized text path, parser artifact path/mime, and pipeline artifact payload path.
- Add storage root resolver with default local app-data paths and configured path overrides.
- Keep legacy DB text readable while new runs write file-backed refs.

## Phase 3 - Fulltext Processing
- Keep text/Markdown parser path.
- Add PDF path through configured external GROBID `/api/processFulltextDocument`.
- Parse TEI into normalized text, sections, paragraphs, and source anchors.
- Return `FULLTEXT_PARSER_UNAVAILABLE` or `FULLTEXT_OCR_REQUIRED` blockers for unavailable service or no-text PDFs.

## Phase 4 - Key Content and Retrieval
- Add paper-level key-content consolidation after section extraction.
- Restrict retrieval to the current active embedding profile and warn on skipped mismatches.

## Phase 5 - UI, Docs, and Verification
- Update desktop settings and operation normalizers.
- Update OpenAPI/API index/DB context and dev-docs.
- Run backend/shared/desktop verification commands and record results.
