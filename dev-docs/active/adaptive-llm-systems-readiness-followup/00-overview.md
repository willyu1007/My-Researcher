# 00 Overview

## Status
- State: done
- Next step: start `F3-experiment-foundation-promotion-candidates` using `06-f2-readiness-summary.md`.

## Goal
- Execute the first two follow-ups from `T-116 adaptive-llm-systems-literature-collection-ingestion`.
- Close the missing canonical classic RAG anchor gap.
- Produce a fulltext/code/protocol readiness review for experiment-foundation and high-priority P0 literature candidates.

## Upstream Context
- Upstream task: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion`.
- Source follow-up list: `11-corpus-readiness-review.md`.
- Current seed corpus from T-116:
  - 89 B1-B6 current-round records.
  - 77 judgment-card-ready records.
  - 13 theory-inclusion-card-ready records.
  - 15 experiment-foundation candidates.
  - 0 current-round multi-priority records.

## Scope
- `F1-import-missing-core-classic`:
  - Import or reconcile `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks` (`arxiv:2005.11401`).
  - Add source provenance and tags consistent with T-116 taxonomy.
  - Verify no content-processing, fulltext acquisition, pipeline, or content asset side effects.
- `F2-fulltext-and-code-readiness-pass`:
  - Review fulltext, code, license/protocol, and runnable-baseline readiness.
  - Cover the 15 experiment-foundation candidates from T-116 and the highest-priority P0 research seeds.
  - Produce a readiness table and promotion recommendations.

## Results
- F1 imported the missing classic RAG anchor as `LIT-0283`.
- F1 side effects:
  - `LiteratureRecord` delta: 1.
  - `LiteratureSource` delta: 1.
  - Content-processing, content asset, pipeline, and fulltext acquisition deltas: 0.
- F2 reviewed 39 targets:
  - 15 experiment-foundation candidates.
  - 24 current-round P0 research seeds.
  - 1 F1 classic RAG anchor.
- F2 found 11 verified code repository candidates and 10 high runnable-feasibility candidates.
- F2 left 16 targets as `needs-manual-followup`.
- No experiment-foundation asset, PaperImplementation dossier, fulltext acquisition job, content-processing job, or pipeline run was created.

## Non-goals
- Do not promote items into experiment-foundation assets in this task.
- Do not create PaperImplementation dossiers or claim shortlists.
- Do not run expensive content processing, embedding, indexing, or fulltext acquisition batches unless a later explicit step says so.
- Do not bulk import B6 staged candidates.
- Do not add taxonomy schema tables.

## Acceptance Criteria
- [x] F1 classic RAG anchor exists with source provenance and T-116-compatible tags.
- [x] F1 import/reconcile side effects are limited to intended literature/source/tag changes.
- [x] F2 target set is explicit and reproducible.
- [x] F2 readiness table covers fulltext, code, protocol, license caveat, and runnable-baseline feasibility.
- [x] No fulltext acquisition, content processing, pipeline run, or embedding/indexing job is created by default.

## Boundaries
- `literature` owns metadata import, source provenance, tags, fulltext/code readiness notes, and content state.
- `experiment-foundation` owns asset creation, benchmark/baseline materialization, and RunRecipe definitions after this readiness pass.
- `PaperImplementation` owns claim-specific paper selection after a concrete research argument is chosen.
