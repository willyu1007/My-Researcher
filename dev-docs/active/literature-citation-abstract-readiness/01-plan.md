# 01 Plan

## Phase A - Inventory
- Locate existing import metadata mapping, citation normalization, dedup hash generation, and abstract display fields.
- Locate current content-processing stage runner behavior for `CITATION_NORMALIZED` and `ABSTRACT_READY`.
- Identify current tests and fixtures for DOI, arXiv, authors, title/year parsing, and abstract handling.

## Phase B - Citation Contract
- Define normalized citation output fields and required provenance.
- Define `citation_complete` rules and reason codes for incomplete records.
- Define when citation metadata changes stale downstream stages versus only refresh display/filter metadata.
- Decide whether normalized citation provenance can remain in existing artifact payloads or needs DB SSOT changes.

## Phase C - Abstract Contract
- Define abstract source priority:
  1. collection metadata abstract.
  2. parsed `Abstract` section from local PDF/HTML/fulltext.
  3. user-entered abstract.
  4. trusted external metadata.
- Define abstract payload with text, source, source ref, checksum, language, confidence, and updated timestamp.
- Define how generated summaries are stored and labeled when they exist.
- Decide whether abstract provenance can remain in existing artifact payloads or needs DB SSOT changes.

## Phase D - Implementation
- Replace placeholder or implicit citation/abstract stage behavior with explicit deterministic services.
- Keep stage execution inside explicit content-processing runs.
- Update metadata patch behavior to refresh stage state/action availability without enqueueing a run.
- Ensure downstream tasks can read citation and abstract artifacts by stable ids/checksums.

## Phase E - Verification Baseline
- Unit tests for DOI/arXiv/title/author/year/source URL normalization.
- Unit tests for `citation_complete` and incomplete reason codes.
- Abstract source-priority tests using metadata, fulltext abstract, manual abstract, trusted external metadata, and missing abstract fixtures.
- Integration test for explicit run to `ABSTRACT_READY`.
- Integration test that collection import does not create a content-processing run.
- Integration test that metadata/abstract patch marks downstream stale without auto-enqueueing.
