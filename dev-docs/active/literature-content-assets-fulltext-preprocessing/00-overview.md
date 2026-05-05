# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: hand off source-aligned anchors to `T-034` and chunking/index consumers to `T-035`.

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
- [x] `FULLTEXT_PREPROCESSED` outputs durable source-aligned artifacts.
- [x] Figure/table/formula assets and relationships are represented.
- [x] Parser/OCR failures produce diagnostics and do not silently mark clean success.
- [x] Downstream stages can cite stable anchors.
