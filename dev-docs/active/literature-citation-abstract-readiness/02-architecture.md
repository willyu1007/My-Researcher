# 02 Architecture

## Boundary
- `CITATION_NORMALIZED` owns bibliographic identity normalization.
- `ABSTRACT_READY` owns the trusted short-form abstract layer.
- Neither stage performs paper-level semantic interpretation, chunking, embedding, indexing, or retrieval.

## Stage Order Position
- Runs after collection and before fulltext preprocessing.
- Canonical order:
  - `CITATION_NORMALIZED`
  - `ABSTRACT_READY`
  - `FULLTEXT_PREPROCESSED`
  - `KEY_CONTENT_READY`
  - `CHUNKED`
  - `EMBEDDED`
  - `INDEXED`

## `CITATION_NORMALIZED` Contract
- Executor:
  - deterministic backend service or script logic.
  - no LLM on the normal path.
- Inputs:
  - collected title, authors, venue/source, year, DOI, arXiv id, source URL, provider metadata, user edits.
- Required outputs:
  - normalized DOI.
  - normalized arXiv id.
  - normalized title.
  - normalized authors.
  - parsed year.
  - normalized source URL.
  - title/authors/year dedup hash.
  - citation completeness status.
  - incomplete reason codes.
  - source metadata refs and input checksum.
- Downstream support:
  - dedup and source identity for collection review.
  - metadata enrichment for chunk filters.
  - stable citation display for retrieval results and writing evidence.

## `ABSTRACT_READY` Contract
- Executor:
  - deterministic source resolver and parser-led extraction.
  - LLM-generated summaries are optional derived content and are not original abstract evidence.
- Inputs:
  - collection metadata abstract.
  - parsed abstract section from local fulltext artifacts when available.
  - user-entered abstract.
  - trusted external metadata payloads.
- Required outputs:
  - `abstract_text`.
  - `abstract_source`.
  - `source_ref`.
  - `checksum`.
  - `language`.
  - `confidence`.
  - `updated_at`.
  - diagnostics and missing reason codes when no trusted abstract is available.
- Downstream support:
  - overview display.
  - `KEY_CONTENT_READY` input.
  - `abstract` chunk generation.
  - retrieval cold start when fulltext is missing.
  - stale propagation when abstract content changes.

## Stale And Trigger Behavior
- Collection completion does not auto-enqueue these stages.
- Explicit content-processing run may target `CITATION_NORMALIZED`, `ABSTRACT_READY`, or later stages.
- Citation identity edits should mark `CITATION_NORMALIZED` stale and may propagate downstream when chunk metadata, source acquisition, or display identity are affected.
- Abstract edits should mark `ABSTRACT_READY`, `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
- Stale propagation only updates state and recommended actions.

## DB Boundary
- Normalized display fields may continue to live on existing `LiteratureRecord` columns where already present.
- Rich provenance, checksums, source refs, diagnostics, and reason codes may require artifact payloads or normalized tables.
- Any new persisted fields or tables must be decided through DB SSOT during task detail.
