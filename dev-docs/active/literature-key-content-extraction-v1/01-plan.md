# 01 Plan

## Phase A - Schema
- Define runtime schema and TypeScript types for `key_content.v1`.
- Define item shape and category arrays.

## Phase B - Extraction
- Implement section-level extraction.
- Implement paper-level consolidation.
- Validate source refs against fulltext/abstract/manual anchors.

## Phase C - Human Edits
- Add provenance and override policy.
- Record conflicts in `quality_report.conflicts`.

## Phase D - Verification Baseline
- Fixtures: abstract-only, fulltext with method/experiments, missing source refs, user-edited field, invalid LLM payload.
- Tests for READY/PARTIAL_READY/FAILED.
