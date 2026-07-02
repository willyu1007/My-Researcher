# 01 Plan

## Phase 1 - Task Setup And Baseline
- Status: completed.
- Create T-120 task bundle.
- Build a reusable runner around existing backend routes.
- Capture target counts, current pipeline table counts, settings, and blockers.

## Phase 2 - Acquisition Canary
- Status: completed.
- Select a small set of tagged arXiv/OA records with high relevance.
- Run fulltext acquisition dry-run.
- Create and poll the durable acquisition job if the dry-run is acceptable.
- Verify content assets and acquisition item outcomes.

## Phase 3 - Metadata/Abstract Backfill Canary
- Status: completed.
- Run content-processing backfill to `ABSTRACT_READY` for the canary set.
- Verify citation and abstract stages.

## Phase 3B - Batch Metadata/Abstract Completion
- Status: completed.
- Run `ABSTRACT_READY` batch backfill for the full 125-record target set.
- Enrich the 9 classic-theory records that were initially missing abstracts using auditable web/OpenAlex metadata sources.
- Repair dedup status after metadata enrichment so enriched existing records remain `unique`.
- Verify 125/125 citation complete and 125/125 abstract ready.

## Phase 3C - Batch ArXiv Fulltext Acquisition
- Status: completed.
- Acquire raw PDFs for all arXiv-backed target records.
- Verify 109/109 arXiv target records have raw fulltext assets.

## Phase 4 - Full Pipeline Canary
- Status: completed.
- Confirm GROBID health.
- Run content-processing backfill to `FULLTEXT_PREPROCESSED` for the canary set.
- Run content-processing backfill to `INDEXED` for the canary set.
- Verify fulltext documents, key-content artifacts, chunks, embeddings, active embedding version, and index stage.

## Phase 5 - Full Pipeline Batch Scaleout
- Status: completed with manual-source exceptions.
- Scaled asset-backed records from `FULLTEXT_PREPROCESSED` to `INDEXED` with explicit provider budgets.
- Added lightweight `codex_curated` key-content dossiers for source-grounded pipeline readiness.
- Recovered 12 missing raw assets through public PDF download candidates; 11 of those reached `INDEXED`.
- Remaining exceptions:
  - `LIT-0252` requires OCR before `FULLTEXT_PREPROCESSED`.
  - `LIT-0257` has no public fulltext asset in the current source set.

## Phase 6 - Counting Convention Lock
- Status: completed.
- Lock the collection denominator to tagged adaptive corpus records:
  - `collection:*`
  - `direction:*`
  - `batch:*`
- Record the difference between raw database size and paper corpus progress:
  - `db_total_records`: 350.
  - `adaptive_corpus_records`: 146.
  - `pipeline_complete_records`: 144.
  - `pipeline_blocked_records`: 2.
  - `non_corpus_records`: 204.
- Treat the 204 non-corpus rows as historical/test/evidence data, not as pending literature pipeline work.
- Use `tools/literature-counting-report.mjs` before and after each future import batch.

## Phase 7 - New Collection Round Plan
- Status: completed for B9 first controlled batch; further batches can continue from the updated denominator.
- Objective: expand the adaptive LLM systems corpus around large-model systems optimization and adaptive resource allocation, then run every newly tagged corpus record through the same standard literature pipeline.
- Direction priority:
  - First: `direction:rag-aware-allocation` for RAG-aware resource allocation, adaptive retrieval-compute allocation, retrieval depth/routing, context assembly budgets, and answer-quality/cost tradeoffs.
  - Second: `direction:llm-serving-resource-allocation` for LLM serving scheduling, batching, KV/cache/resource allocation, disaggregated serving, autoscaling, and inference-system optimization.
  - Third: `direction:test-time-compute-budgeting` for adaptive inference-time compute, deliberation budgets, early exit, verifier/controller policies, and accuracy-latency-cost tradeoffs.
- Collection roles:
  - `collection:core`: papers directly defining the three directions or offering implementable algorithms/evaluation targets.
  - `collection:system-support`: serving, storage, cache, scheduler, workload, benchmark, and infrastructure substrates needed for experiment-base implementation.
  - `collection:strategy-support`: control, bandit/RL, online optimization, budget allocation, routing, stopping, and policy-learning papers.
  - `collection:theory-support`: retrieval theory, information theory, submodularity, online algorithms, measure/probability, metric/embedding geometry, algebraic/spatial abstractions, and other math that can support new research ideas.
- Candidate source surfaces:
  - arXiv, OpenAlex, Semantic Scholar, DBLP, ACM Digital Library, USENIX, ACL Anthology, MLSys, NeurIPS, ICML, ICLR, SIGMOD, VLDB, OSDI, and SOSP.
- Search strategy:
  - Start from known seed papers in the three directions and expand by citation/backward-reference neighborhoods.
  - Run query-ledger searches per direction and role, preserving exact query text, source, date, and result count in artifacts.
  - Prefer recent frontier papers for the core/system/strategy roles, but include classic theory papers when they provide reusable formal machinery.
  - Keep theory-support as seed material for problem formulation; do not over-count it as direct system evidence unless it has an explicit bridge to RAG, serving, or test-time compute allocation.
- Import gate:
  - Each imported record MUST have at least one stable corpus tag among `collection:*`, `direction:*`, or `batch:*`.
  - Each imported record SHOULD have title, authors, year, venue/source, DOI/arXiv/OpenAlex/Semantic Scholar identifier when available, abstract or source evidence, and provenance notes.
  - Each imported record MUST pass dedup/title reconciliation before it is counted as new adaptive corpus growth.
  - Each batch MUST refresh the counting report after import.
- Pipeline gate:
  - Newly imported adaptive corpus records first target citation normalization and `ABSTRACT_READY`.
  - Public fulltext acquisition uses arXiv/OA/public-source paths first; non-public records stay metadata-ready until rights-safe sources exist.
  - Asset-backed records proceed through `FULLTEXT_PREPROCESSED`, lightweight key-content readiness, chunking, embedding, and indexing.
  - Any blocker must be recorded as source missing, OCR required, rights restricted, parser unavailable, or provider-budget deferred.
- Planned artifacts:
  - `artifacts/b9-query-ledger.*`
  - `artifacts/b9-candidates-manifest.*`
  - `artifacts/b9-import-report.*`
  - `artifacts/b9-pipeline-status.*`
  - refreshed `artifacts/*counting-conventions*.json`
- B9 execution result:
  - Query groups: 42.
  - Discovered candidates: 153.
  - Metadata imports: 22.
  - Valid adaptive corpus records retained: 21.
  - Withdrawn/excluded record: `LIT-0337`.
  - Valid B9 corpus records indexed: 21/21.
  - Corpus denominator after B9: 146.
  - Indexed corpus after B9: 144.

## Phase 8 - LIT-0252 Partial Visual Index
- Status: completed as partial retrieval support, not standard pipeline completion.
- Objective: keep `LIT-0252` in the theory-support corpus without falsely claiming fulltext preprocessing or standard indexing.
- Input:
  - Visual extraction doc: `08-lit-0252-visual-extraction.md`.
  - Visual extraction artifact: `artifacts/lit-0252-visual-extraction.json`.
- Execution:
  - Added and ran `tools/lit-0252-visual-index.mjs`.
  - Created 13 visual-summary chunks.
  - Created active embedding version `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
  - Recorded embedding status `PARTIAL_INDEXED`.
- Boundary:
  - `FULLTEXT_PREPROCESSED` remains blocked by `FULLTEXT_OCR_REQUIRED`.
  - Standard `INDEXED` remains `NOT_STARTED`.
  - Standard complete count remains 144/146.
- Verification:
  - Scoped standard `/literature/retrieve` returned HTTP 200.
  - `LIT-0252` ranked 1/1 for a nearest-neighbor distance-contrast query.
  - Refreshed counting artifact: `artifacts/20260604T-after-lit-0252-visual-index-counting.json`.

## Acceptance Gates
- Gate A: target-set and settings preflight.
- Gate B: acquisition canary.
- Gate C: abstract pipeline canary.
- Gate D: indexed canary after GROBID is available.
- Gate E: batch scaleout summary and governance lint.
- Gate F: counting convention report confirms collection progress uses the adaptive corpus denominator.
- Gate G: new collection round has query-ledger, candidate, import, and pipeline status artifacts before scaleout claims.
- Gate H: partial visual indexing must preserve standard blocker semantics and prove scoped retrieval availability.
