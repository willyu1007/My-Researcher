# 00 Overview

## Status
- State: planned
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: inventory existing artifact tables/runtime and decide the asset metadata DB boundary.

## Goal
- Replace placeholder fulltext preprocessing with local asset-backed, source-aligned fulltext artifacts.

## Non-goals
- Do not perform paper-level semantic interpretation in this task.
- Do not implement `KEY_CONTENT_READY` extraction.
- Do not add complex rights management beyond current process/block gates.

## Scope
- Local raw file references.
- Normalized text artifacts.
- Document structure, paragraphs, offsets, checksums.
- Figure/table/formula/caption/OCR/layout anchors.
- Parser/OCR diagnostics and partial readiness.

## Acceptance Criteria
- `FULLTEXT_PREPROCESSED` outputs durable source-aligned artifacts.
- Figure/table/formula assets and relationships are represented.
- Parser/OCR failures produce diagnostics and do not silently mark clean success.
- Downstream stages can cite stable anchors.
