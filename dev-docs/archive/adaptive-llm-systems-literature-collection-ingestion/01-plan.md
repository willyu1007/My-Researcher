# 01 Plan

## Phase 1 - Taxonomy Freeze
- Status: completed. See `06-taxonomy.md`.
- Define the top-level collection tags:
  - `collection:core`
  - `collection:system-support`
  - `collection:strategy-support`
  - `collection:theory-support`
- Define direction tags:
  - `direction:rag-aware-allocation`
  - `direction:llm-serving-resource-allocation`
  - `direction:test-time-compute-budgeting`
- Define common fit and priority tags:
  - `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`, `priority:p4`
  - `fit:experiment-foundation`
  - `fit:paper-implementation`
  - `classification:low-confidence`
- Define theory tags:
  - `theory:queueing`
  - `theory:bandit`
  - `theory:mdp`
  - `theory:optimal-stopping`
  - `theory:constrained-optimization`
  - `theory:submodular`
  - `theory:measure`
  - `theory:optimal-transport`
  - `theory:information-theory`
  - `theory:metric-space`
  - `theory:group-action`
  - `theory:field-coding`
  - `theory:lattice`
- Freeze assignment rules:
  - exactly one primary `collection:*` tag per curated item.
  - use `bridge:*` tags for cross-layer papers.
  - P0/P1 items require lightweight judgment cards.
  - theory items require a theory inclusion card.

## Phase 2 - Seed Catalog
- Status: completed. See `07-seed-catalog.md`.
- Build a curated seed list for:
  - adaptive RAG / RAG serving / resource-aware RAG.
  - LLM serving, KV cache, prefill/decode, batching, SLO allocation.
  - test-time compute scaling, adaptive budget, routing/cascade, early stopping.
  - mathematical and algorithmic foundations.
- Seed entries must include:
  - title,
  - year,
  - source URL,
  - collection layer,
  - subcluster,
  - why relevant,
  - initial tags,
  - priority.

## Phase 3 - Query Catalog
- Status: completed. See `08-query-catalog.md`.
- Build query groups per layer.
- Record intended source, time window, inclusion rules, and default tags for each query.
- Example query families:
  - `RAG serving optimization`, `adaptive retrieval compute allocation`, `retrieval gating RAG`, `context budget RAG`.
  - `LLM serving scheduling`, `prefill decode disaggregation`, `KV cache scheduling`, `SLO aware LLM serving`.
  - `test-time compute budgeting`, `difficulty aware reasoning budget`, `confidence based early stopping`, `model routing cost quality`.
  - `queueing theory LLM serving`, `contextual bandit retrieval`, `optimal stopping adaptive inference`, `measure concentration embedding space`, `group action chunking`.

## Phase 4 - Controlled Import Batches
- Status: completed. B1 import, B1 metadata refresh, B1 title reconciliation, B2 import, B3 import, B4 import, B5 import, and B6 citation-expansion controlled import completed; see `09-import-batches.md`.
- Run import in batches grouped by query/source/layer.
- For each batch record:
  - query/source,
  - date,
  - default tags,
  - imported count,
  - merged/duplicate count,
  - low-confidence count,
  - notable misses.
- Do not enqueue fulltext acquisition or content processing by default.
- Current next step:
  - Choose a follow-up from `11-corpus-readiness-review.md`; recommended first choices are `F1-import-missing-core-classic` and `F2-fulltext-and-code-readiness-pass`.
- Carry-forward cleanup:
  - `B6-stage-review-backlog`: review non-imported staged candidates before any further citation expansion import.

## Phase 5 - P0/P1 Lightweight Judgment Cards
- Status: completed. See `10-judgment-cards.md`.
- For P0/P1 papers, add or record:
  - `why_relevant`
  - `resource_variable`
  - `decision_variable`
  - `quality_metric`
  - `system_metric`
  - `benchmark_or_dataset`
  - `code_available`
  - `experiment_foundation_fit`
  - `paper_implementation_fit`
- Store the structured judgment outside the schema initially; use tags for coarse in-app filtering.
- Phase 5 generated:
  - 77 lightweight judgment cards.
  - 13 theory inclusion cards.
  - `classification:judgment-card-ready` tags for the covered P0/P1 records.
  - `classification:theory-inclusion-card-ready` tags for B5 theory records.

## Phase 6 - Readiness Review And Follow-up Split
- Status: completed. See `11-corpus-readiness-review.md`.
- Review layer distribution, year distribution, and P0/P1 coverage.
- Identify missing subclusters.
- Split follow-up tasks only if needed:
  - automated classifier,
  - structured taxonomy schema,
  - fulltext acquisition campaign,
  - experiment-foundation candidate promotion,
  - PaperImplementation candidate selection.
- Phase 6 produced:
  - readiness decision for the 89-record current-round corpus.
  - coverage distribution by layer, direction, effective priority, and time band.
  - 7 follow-up tasks with owner boundaries and acceptance criteria.
  - priority reconciliation evidence showing 0 current-round multi-priority records.

## Initial Acceptance Gates
- Gate A: taxonomy accepted.
- Gate B: seed catalog accepted.
- Gate C: query catalog accepted.
- Gate D: first controlled import batch accepted.
- Gate E: P0/P1 judgment cards accepted.
- Gate F: corpus readiness review accepted.
