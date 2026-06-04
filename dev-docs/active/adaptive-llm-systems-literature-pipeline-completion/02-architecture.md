# 02 Architecture

## Boundaries
- Literature DB remains the source of truth for metadata, sources, assets, pipeline runs, stage states, embeddings, and indexes.
- This task uses existing APIs:
  - `/literature/fulltext-acquisition/dry-runs`
  - `/literature/fulltext-acquisition/jobs`
  - `/literature/content-processing/backfill/dry-runs`
  - `/literature/content-processing/backfill/jobs`
  - `/settings/literature-content-processing`
  - `/settings/literature-acquisition`
- GROBID remains an external dependency and is not started by backend business logic.

## Target Set
- Include records with at least one of:
  - `collection:*`
  - `direction:*`
  - `batch:*`
- Exclude records without corpus tags, including topic-selection API evidence rows.

## Campaign Order
- Acquisition before fulltext preprocessing.
- `ABSTRACT_READY` can run without GROBID.
- `FULLTEXT_PREPROCESSED` requires a raw fulltext asset and a reachable GROBID parser for PDFs.
- `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` depend on successful fulltext preprocessing.

## Risks
- External PDF downloads can fail or be rate-limited.
- GROBID is unavailable unless Docker/service is running.
- Embedding and key-content extraction can consume provider budget.
- Some records have `UNKNOWN` rights and may need source-specific acquisition or manual review.
