# 01 Plan

## Phase A - Inventory
- Inspect current artifact runtime, repository models, and file upload paths.
- Identify parser/OCR libraries already present or acceptable.

## Phase B - Data Contract
- Define fulltext artifact payload and local asset refs.
- Decide DB fields vs artifact JSON for asset metadata.

## Phase C - Implementation
- Replace metadata-only placeholder fulltext generation.
- Materialize normalized text and structural anchors.
- Extract figure/table/formula/caption/OCR refs where available.

## Phase D - Verification Baseline
- Fixtures: text-only paper, PDF-like fixture, missing fulltext, image/table partial extraction.
- Tests for source refs, checksums, diagnostics, and stale propagation.
