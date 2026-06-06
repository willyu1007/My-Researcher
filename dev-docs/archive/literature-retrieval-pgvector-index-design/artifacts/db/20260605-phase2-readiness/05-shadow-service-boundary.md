# Shadow Service Boundary

## Decision
- Phase 2 shadow parity is an internal runner boundary, not a public response contract change.
- The current public `/literature/retrieve` behavior remains JSONB.
- `LiteratureRetrieveResponse` must not add shadow telemetry or pgvector diagnostics in Phase 2.

## Recommended Implementation Boundary
- Add an internal runner or service equivalent to `LiteratureRetrievalPgvectorShadowRunner`.
- The runner may call the current JSONB retrieval path to capture baseline.
- The runner may call pgvector candidate retrieval through the repository after sample backfill.
- The runner writes artifacts under the Phase 2 evidence root.
- The runner does not return shadow data to controllers.

## Allowed Refactor
- Extract shared ranking or grouping helpers from `LiteratureRetrievalService` only when needed to prevent semantic drift.
- Keep controller and shared DTO contracts unchanged.
- Keep pgvector SQL, vector operators, and native vector score mapping in repository code.

## Candidate Source Contract
- JSONB baseline source:
  - loads current chunks and scores through existing JSONB path.
  - records existing failure if unscoped retrieval hits the known scale boundary.
- Pgvector shadow source:
  - receives `eligibleEmbeddingVersionIds`.
  - receives a normalized query vector.
  - receives internal candidate-limit settings.
  - returns bounded candidates and telemetry without raw JSONB vectors.

## Required Tests
- Public literature retrieve contract tests prove no shadow fields are added.
- Shadow runner tests prove artifacts contain pgvector telemetry.
- Repository tests prove candidate SQL does not select `LiteratureEmbeddingChunk.vector`.
- Service/runner tests prove stale-ineligible version IDs are filtered before repository call when `include_stale = false`.
