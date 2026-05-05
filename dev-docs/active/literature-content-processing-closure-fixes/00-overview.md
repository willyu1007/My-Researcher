# 00 Overview

## Status
- State: completed
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: deploy with the Prisma migration and run with a local GROBID service when PDF ingestion is needed.

## Goal
- Close the remaining semantic and implementation gaps found after the first content-processing landing pass.
- Keep collection/content-processing terminology clean at public boundaries.
- Make PDF fulltext preprocessing usable through a local GROBID service while keeping OCR as a later explicit task.

## Non-goals
- Do not auto-start or manage the GROBID process from backend stage runs.
- Do not implement OCR for scanned PDFs.
- Do not implement visual semantic interpretation of figures/tables beyond source anchors and parser metadata.
- Do not reintroduce old public `pipeline` DTO or route semantics.

## Scope
- Public DTO rename for backfill batch run ids.
- Single active embedding profile retrieval.
- Storage-root-backed local files for normalized text and large artifacts.
- GROBID-backed PDF fulltext preprocessing.
- Paper-level key-content consolidation.

## Review Findings Covered
- [x] Public DTO still exposes the legacy run-id field name.
- [x] Retrieval can merge multiple embedding profiles.
- [x] PDF/OCR/layout extraction is not implemented.
- [x] Storage roots are saved but not consumed.
- [x] Key-content extraction lacks paper-level consolidation.

## Acceptance Criteria
- [x] Backfill public DTO/OpenAPI/frontend use `content_processing_run_id` only.
- [x] Retrieve only embeds/query-ranks against the configured active embedding profile.
- [x] PDF fulltext preprocessing calls configured GROBID and persists normalized text/TEI refs through storage roots.
- [x] Missing GROBID and scanned/no-text PDFs produce explicit blockers.
- [x] KEY_CONTENT_READY includes a paper-level consolidation pass.
- [x] DB context, API index, OpenAPI, tests, and project governance are synchronized.
