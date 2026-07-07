# 00 Overview

## Status
- State: done
- Next step: choose a follow-up from `11-corpus-readiness-review.md`, starting with `F1-import-missing-core-classic` or `F2-fulltext-and-code-readiness-pass`.

## Goal
- Complete the current literature collection and ingestion round for adaptive LLM systems.
- Build a tagged, auditable corpus around:
  - RAG-aware adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
  - Theory support for adaptive resource allocation and novel RAG/LLM system modeling.
- Ensure the collected corpus can later feed topic selection, experiment foundation, and paper implementation without losing provenance or triage rationale.

## Current Baseline
- The literature pipeline already supports metadata import, dedup, sources, tags, topic scope, content-processing states, fulltext acquisition jobs, key-content extraction, chunking, embedding, indexing, retrieval, and overview display.
- `LiteratureRecord.tags` already exists and can carry namespaced tags for this task.
- Auto-pull can collect from Crossref, arXiv, and Zotero; manual import remains available for OpenReview/ACL/ACM/USENIX/IEEE and curated seed papers when provider coverage is incomplete.
- Existing auto-pull quality scoring is a ranking signal, not the four-layer research classification or lightweight judgment card required by this task.

## Non-goals
- Do not add a new taxonomy database schema in this task.
- Do not rewrite the collection/content-processing boundary here — the boundary decision is `T-029`(2026-07 由 T-130 修订为「可经显式闸门编排,默认关」), SSOT: `docs/context/process/literature-pipeline-matrix.md` §Pre-stage Domains.
- Do not auto-run expensive content-processing stages as part of collection.
- Do not make all imported papers evidence-active.
- Do not require human review for every imported paper.
- Do not promise a fixed corpus size in this task; prioritize coverage quality and corpus shape first.

## Scope
- Four-layer collection taxonomy.
- Seed paper catalog.
- Query catalog and source strategy.
- Controlled metadata import and dedup observation.
- Namespaced tag application through existing `tags`.
- P0/P1 lightweight judgment cards.
- Import and corpus readiness evidence.

## Phase 4 Progress
- `B1-core-high-precision` completed on 2026-06-03.
- Imported 14 core seed-anchor records: `LIT-0177` through `LIT-0190`.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B1.
- arXiv exact-id metadata fetch returned `429`; B1 used exact title/year fallback metadata from `07-seed-catalog.md`.
- `B1-refresh-arxiv-metadata` completed on 2026-06-03.
- All 14 B1 records now have author and abstract metadata, with no new literature/source rows and no content-processing side effects.
- `B1-title-reconciliation` completed on 2026-06-03.
- Updated `LIT-0178` and `LIT-0188` from seed fallback display titles to arXiv canonical titles, while preserving B1 tags and source provenance.
- `B2-core-system-bridge` completed on 2026-06-03.
- Imported 12 RAG serving/cache/workload bridge records: `LIT-0194` through `LIT-0205`.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B2.
- `B3-system-substrate` completed on 2026-06-03.
- Imported 19 serving substrate records: `LIT-0207` through `LIT-0225`.
- B3 covered continuous batching, KV/prefix cache, prefill/decode, P/D disaggregation, SLO/tail latency, heterogeneous serving, and serving workload/simulator support.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B3.
- `B4-strategy-policy` completed on 2026-06-03.
- Imported 19 strategy policy records: `LIT-0226` through `LIT-0244`.
- B4 covered test-time compute scaling, difficulty-aware budget allocation, model routing/cascades, confidence gating, early stopping, verifier/reflection budget, search-style reasoning, and adaptive inference surveys.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B4.
- `B5-theory-mapping` completed on 2026-06-03.
- Imported 13 theory-support records: `LIT-0249` through `LIT-0261`.
- B5 covered queueing, online scheduling, bandits, MDP/optimal stopping, submodular/knapsack selection, information theory, measure/risk, optimal transport, high-dimensional geometry/ANN, group/quotient space, coding/sketching, and lattice/ultrametric spaces.
- Manual classic theory records have stable titles, authors, source URLs, tags, and theory mappings; arXiv theory records also have abstracts.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B5.
- `B6-citation-expansion` completed on 2026-06-03.
- Staged 807 citation/reference expansion candidates from 12 P0/P1 seeds; 393 automatic import-candidate suggestions were not bulk imported.
- Imported a controlled 12-record triaged subset: `LIT-0266` through `LIT-0277`.
- B6 added direct citation-expansion records for RAG cache routing, online RAG serving, adaptive retriever portfolios, vector-search/P-D disaggregation, lookahead retrieval, RAG-vs-long-context routing, constraint-aware serving, long-context serving, calibrated cascade routing, unified routing/test-time scaling, inference scaling for long-context RAG, and RALM accelerator systems.
- No content-processing, content asset, content-processing batch, or fulltext acquisition job was created by B6.
- Phase 4 controlled import batches and B1 title reconciliation are complete; remaining work moves to judgment cards and corpus readiness review.

## Phase 5 Progress
- Phase 5 completed on 2026-06-03.
- Generated 77 lightweight judgment cards for P0/P1 records from B1/B2/B3/B4/B5/B6.
- Generated 13 theory inclusion cards for all B5 theory-mapping records.
- Converted `classification:needs-judgment-card` to `classification:judgment-card-ready` on the 77 covered records.
- Added `classification:theory-inclusion-card-ready` to the 13 B5 records.
- No literature/source rows, content assets, content-processing batch jobs, fulltext acquisition jobs, or pipeline runs were created.

## Phase 6 Progress
- Phase 6 completed on 2026-06-04.
- Current-round corpus denominator: 89 B1-B6 records.
- Readiness decision: ready as a research seed corpus and follow-up planning substrate.
- Not ready for automatic evidence-active promotion or unreviewed 5000-record bulk expansion.
- Priority tags reconciled on 2026-06-04; current-round multi-priority count is 0.
- Coverage summary:
  - `collection:core`: 34.
  - `collection:system-support`: 21.
  - `collection:strategy-support`: 21.
  - `collection:theory-support`: 13.
- Follow-up split created 7 explicit follow-up tasks in `11-corpus-readiness-review.md`.

## Acceptance Criteria
- [x] Four-layer taxonomy is documented and uses stable namespaced tags.
- [x] Seed catalog covers the three agreed research directions plus theory support.
- [x] Query catalog covers core, system support, strategy support, and theory support.
- [x] Collection/import batches are recorded with source, query, batch purpose, and resulting literature IDs.
- [x] Imported items receive coarse tags whenever classification is clear.
- [x] P0/P1 items have lightweight judgment cards or are explicitly queued as `classification:low-confidence`.
- [x] The task produces a corpus readiness summary with gaps and recommended follow-ups.
- [x] No schema migration or content-processing behavior change is introduced by this task.

## Related Boundaries
- `literature` owns candidate discovery, metadata, source provenance, tags, content assets, and retrieval state.
- `experiment-foundation` owns reusable datasets, benchmarks, baselines, run recipes, execution jobs, result facts, and evidence candidates.
- `PaperImplementation` owns experiment motive, work orders, run evidence interpretation, claim trace, and implementation dossier readiness.
