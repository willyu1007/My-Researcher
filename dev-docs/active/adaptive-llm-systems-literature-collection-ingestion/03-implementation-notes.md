# 03 Implementation Notes

## 2026-06-03 - Task Package Created
- Created this task package for the current adaptive LLM systems literature collection and ingestion round.
- Decision: reuse existing `LiteratureRecord.tags` for namespaced taxonomy; do not add schema in this task.
- Decision: only P0/P1 items require full lightweight judgment cards during this round.
- Decision: collection/import remains separate from content processing.

## 2026-06-03 - Phase 1 Taxonomy Freeze
- Added `06-taxonomy.md` as `taxonomy.v1`.
- Froze tag grammar as flat namespaced lowercase ASCII tags stored in existing `LiteratureRecord.tags`.
- Froze cardinality rule: exactly one primary `collection:*` tag per curated item; use `bridge:*` for cross-layer papers.
- Added allowed values for collection, bridge, direction, subcluster, resource, decision, metric, theory, fit, priority, classification, and era tags.
- Added theory inclusion card requirements so mathematical/theory items must map to a RAG/LLM system phenomenon, experiment variable, metric, policy, or bound.
- Marked Phase 1 complete and moved Phase 2 seed catalog to next.

## 2026-06-03 - Phase 2 Seed Catalog
- Added `07-seed-catalog.md` as `seed-catalog.v1`.
- Curated 49 seed papers across the four collection layers:
  - 19 core seeds for RAG-aware allocation, adaptive retrieval, RAG serving, workload, and evaluation.
  - 10 system-support seeds for serving scheduling, KV cache, batching, prefill/decode, P/D disaggregation, and SLO allocation.
  - 8 strategy-support seeds for test-time compute scaling, cascades, routing, and adaptive reasoning budget.
  - 12 theory-support seeds for queueing, bandit, submodular selection, information theory, metric/high-dimensional geometry, optimal transport, group action, quotient-space, and coding/sketching ideas.
- Added initial namespaced tags and import hints per seed without changing the database schema.
- Queued P0/P1 seeds for Phase 5 lightweight judgment cards.
- Added Phase 3 query expansion hints derived from seed anchors.
- Marked Phase 2 complete and moved Phase 3 query catalog to next.

## 2026-06-03 - Phase 3 Query Catalog
- Added `08-query-catalog.md` as `query-catalog.v1`.
- Converted Phase 2 seed anchors into 38 query families:
  - 10 core query families for retrieval gating, retrieval depth, context budget, RAG serving, cached RAG, routing, multi-hop stopping, rerank budget, workload/benchmark, and faithfulness under budget.
  - 8 system-support query families for batching/scheduling, KV cache, prefix cache, prefill/decode, P/D disaggregation, SLO/tail latency, heterogeneous serving, and serving workloads.
  - 8 strategy-support query families for test-time compute scaling, difficulty-aware budget, model routing/cascades, confidence gating, early stopping, verifier budget, search-style reasoning, and surveys.
  - 12 theory-support query families for queueing, online scheduling, bandits, MDP/optimal stopping, submodular/knapsack selection, information theory, measure/risk, optimal transport, metric/high-dimensional geometry, group/quotient space, coding/sketching, and lattice/ultrametric spaces.
- Added source routing for arXiv, Crossref, Zotero/manual, OpenReview, ACL, USENIX/ACM/IEEE, and auxiliary Semantic Scholar/OpenAlex expansion.
- Added Phase 4 batch order from high-precision core import through theory mapping and citation expansion.
- Marked Phase 3 complete and moved Phase 4 controlled imports to next.

## 2026-06-03 - Phase 4 B1 Controlled Import
- Added `09-import-batches.md` as the Phase 4 import batch log.
- Ran `B1-core-high-precision` through the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `arxiv:auto-exact-id`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-core-high-precision-import.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-core-high-precision-import-report.json`.
- Imported 14 new `collection:core` records:
  - `LIT-0177` through `LIT-0190`.
- Added coarse tags from `08-query-catalog.md`, plus operational `batch:*` and `query:*` tags for traceability.
- Added `classification:needs-judgment-card` to B1 P0 imports so Phase 5 can create lightweight cards.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- arXiv exact-id metadata fetch returned `429`; B1 used exact title/year fallback metadata from `07-seed-catalog.md`.
- Queued `B1-refresh-arxiv-metadata` before relying on author/abstract fields.

## 2026-06-03 - Phase 4 B1 Metadata Refresh
- Ran `B1-refresh-arxiv-metadata` against `LIT-0177` through `LIT-0190`.
- The arXiv export API path was unreliable after the B1 `429`, so the refresh used sequential exact-ID arXiv HTML metadata:
  - Source route: `arxiv:html-exact-id-sequential`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-refresh-arxiv-metadata.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-refresh-arxiv-metadata-report.json`.
- Re-imported refreshed metadata through the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Matched all 14 records by `arxiv_id`.
  - New `LiteratureRecord` delta: 0.
  - New `LiteratureSource` delta: 0.
- Confirmed all 14 B1 records now have author arrays and abstracts.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Recorded two title-display mismatches for later reconciliation before Phase 5 judgment cards:
  - `LIT-0178` / `2305.06983`.
  - `LIT-0188` / `2511.09803`.

## 2026-06-03 - Phase 4 B1 Title Reconciliation
- Ran `B1-title-reconciliation` against the two B1 title-display mismatches.
- Used exact-ID arXiv HTML citation metadata as the canonical title source:
  - Source route: `arxiv:html-exact-id`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-title-reconciliation.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b1-title-reconciliation-report.json`.
- Updated only `LiteratureRecord.title`, `normalizedTitle`, `titleAuthorsYearHash`, and `updatedAt`:
  - `LIT-0178`: `FLARE: Forward-Looking Active Retrieval Augmented Generation` to `Active Retrieval Augmented Generation`.
  - `LIT-0188`: `TARG: Retrieval-Augmented Generation with Cost-Effective Textual Uncertainty Estimation` to `Retrieval as a Decision: Training-Free Adaptive Gating for Efficient RAG`.
- Preserved seed aliases in the reconciliation report so Phase 5 judgment cards can mention method acronyms without using them as canonical titles.
- Verified no source, tag, content-processing, content asset, batch job, or fulltext acquisition side effects.

## 2026-06-03 - Phase 4 B2 Core-System Bridge Import
- Ran `B2-core-system-bridge` for the RAG serving/cache/workload bridge layer.
- Used the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `arxiv:html-exact-id-sequential`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b2-core-system-bridge-import.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b2-core-system-bridge-import-report.json`.
- Covered:
  - `Q-COR-04` RAG Serving / Configuration Adaptation.
  - `Q-COR-05` Cached RAG / Knowledge or Context Reuse.
  - `Q-COR-09` RAG Workload / Trace / Benchmark for Systems.
- Imported 12 new `collection:core`, `bridge:core-system` records:
  - `LIT-0194` through `LIT-0205`.
- Added `classification:needs-judgment-card` to all B2 imports because the batch is P0/P1-heavy and should feed Phase 5 judgment cards.
- Confirmed all 12 B2 records have author arrays, abstracts, batch tags, and query tags.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Moved the Phase 4 next import decision to `B3-system-substrate`.

## 2026-06-03 - Phase 4 B3 System Substrate Import
- Ran `B3-system-substrate` for the LLM serving substrate layer.
- Used the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `arxiv:html-exact-id-sequential+usenix:manual`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b3-system-substrate-import.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b3-system-substrate-import-report.json`.
- Covered `Q-SYS-01` through `Q-SYS-08`:
  - continuous batching/request scheduling,
  - KV cache/paged attention/cache eviction,
  - prefix/prompt/radix cache,
  - prefill/decode interference and chunked prefill,
  - P/D disaggregation and resource allocation,
  - SLO/tail latency/admission control,
  - heterogeneous serving/GPU memory/offload,
  - serving workloads/benchmarks/traces.
- Imported 19 new `collection:system-support` records:
  - `LIT-0207` through `LIT-0225`.
- Added `classification:needs-judgment-card` to all B3 imports because the batch is P1 baseline-heavy and should feed Phase 5 judgment cards.
- Confirmed all 19 B3 records have author arrays, abstracts, batch tags, and query tags.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Moved the Phase 4 next import decision to `B4-strategy-policy`.

## 2026-06-03 - Phase 4 B4 Strategy Policy Import
- Ran `B4-strategy-policy` for the test-time compute and adaptive strategy layer.
- Used the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `arxiv:html-exact-id-sequential`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b4-strategy-policy-import.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b4-strategy-policy-import-report.json`.
- Covered `Q-STR-01` through `Q-STR-08`:
  - test-time compute scaling,
  - difficulty-aware budget allocation,
  - model routing/cascades,
  - confidence gating/uncertainty/abstention,
  - early stopping/continue-stop policies,
  - verifier/critic/reflection budget,
  - search-style reasoning budget,
  - budgeted adaptive inference surveys.
- Imported 19 new `collection:strategy-support` records:
  - `LIT-0226` through `LIT-0244`.
- Added `classification:needs-judgment-card` to all B4 imports because the batch is P0/P1-heavy and should feed Phase 5 judgment cards.
- Confirmed all 19 B4 records have author arrays, abstracts, batch tags, and query tags.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Moved the Phase 4 next import decision to `B5-theory-mapping`.

## 2026-06-03 - Phase 4 B5 Theory Mapping Import
- Ran `B5-theory-mapping` for the theory-support layer.
- Used the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `arxiv:html-exact-id-sequential+manual:doi-book-neurips`.
  - Execution artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b5-theory-mapping-import.mjs`.
  - Report artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b5-theory-mapping-import-report.json`.
- Covered `Q-THY-01` through `Q-THY-12`:
  - queueing for LLM serving and variable tokens,
  - online scheduling / competitive allocation,
  - bandits / contextual bandits for routing,
  - MDP / RL / optimal stopping for RAG,
  - submodular / knapsack evidence selection,
  - information theory / bottleneck / rate-distortion,
  - measure / distribution shift / risk,
  - optimal transport for query-corpus alignment,
  - high-dimensional geometry / metric space / ANN,
  - group action / quotient space for chunking,
  - coding / sketching / MinHash / LSH for evidence space,
  - lattice / ultrametric / hierarchical evidence spaces.
- Imported 13 new `collection:theory-support` records:
  - `LIT-0249` through `LIT-0261`.
- Added `classification:needs-judgment-card` only to the P1 LLM serving queueing bridge record; other B5 theory records remain P3 with explicit theory inclusion mappings in the report and batch log.
- Confirmed all 13 B5 records have author arrays, batch tags, theory-support tags, and query tags.
- Metadata caveat: manual classic theory records do not have imported abstracts in this batch; arXiv theory records have abstracts from exact-ID arXiv HTML metadata.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Moved the Phase 4 next import decision to `B6-citation-expansion`.

## 2026-06-03 - Phase 4 B6 Citation Expansion
- Ran `B6-citation-expansion` in two steps:
  - staging through Semantic Scholar references/citations,
  - controlled import through arXiv exact-ID metadata.
- Used the existing collection import boundary:
  - Route: `POST /literature/collections/import`.
  - Source route: `semantic-scholar:graph-api-references-citations+arxiv:html-exact-id-sequential`.
  - Stage artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-stage.mjs`.
  - Stage report: `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-stage-report.json`.
  - Candidate table: `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-candidates.md`.
  - Import artifact: `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-import.mjs`.
  - Import report: `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-import-report.json`.
- Staged 807 candidates from 12 P0/P1 seeds with zero relation fetch failures.
- Did not bulk import 393 automatic import-candidate suggestions; selected 12 records through explicit seed-relation and topic-fit triage.
- Imported 12 new records:
  - `LIT-0266` through `LIT-0277`.
- Added `classification:needs-judgment-card` to all B6 imports because they are P1 citation-expansion candidates.
- Confirmed all 12 B6 records have author arrays, abstracts, batch tags, collection tags, and `query:b6-*` tags.
- Verified no content-processing side effects:
  - `LiteraturePipelineRun` delta: 0.
  - `LiteratureContentAsset` delta: 0.
  - `LiteratureContentProcessingBatchJob` delta: 0.
  - `LiteratureFulltextAcquisitionJob` delta: 0.
- Marked Phase 4 controlled import batches complete and moved the next step to Phase 5 preparation.

## 2026-06-03 - Phase 5 Judgment Cards And Theory Inclusion Cards
- Ran `phase5-judgment-cards` to create task evidence artifacts without adding schema tables.
- Replay tool: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/tools/phase5-judgment-cards.mjs`.
- Generated artifacts:
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/10-judgment-cards.md`.
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-cards.json`.
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-cards-report.json`.
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-card-tag-apply-report.json`.
- Generated 77 lightweight judgment cards across:
  - B1: 14.
  - B2: 12.
  - B3: 19.
  - B4: 19.
  - B5: 1.
  - B6: 12.
- Generated 13 theory inclusion cards for B5 theory-mapping records.
- Resolved the Phase 5 storage decision by keeping cards as task evidence artifacts and using coarse tags for in-app filtering.
- Updated covered records:
  - Removed `classification:needs-judgment-card` from 77 records.
  - Added `classification:judgment-card-ready` to 77 records.
  - Added `classification:theory-inclusion-card-ready` to 13 B5 records.
- Verified no literature/source rows, content-processing jobs, content assets, fulltext jobs, or pipeline runs were created.
- Moved the next step to Phase 6 corpus readiness review.

## 2026-06-04 - Phase 6 Corpus Readiness Review
- Ran `phase6-corpus-readiness` to generate the final readiness review and follow-up split.
- Replay tool: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/tools/phase6-corpus-readiness.mjs`.
- Generated artifacts:
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/11-corpus-readiness-review.md`.
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase6-corpus-readiness.json`.
  - `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase6-corpus-readiness-report.json`.
- Reviewed the current-round B1-B6 denominator of 89 records:
  - Core: 34.
  - System support: 21.
  - Strategy support: 21.
  - Theory support: 13.
- Readiness decision: ready as a research seed corpus and follow-up planning substrate.
- Explicitly not ready for automatic evidence-active promotion or unreviewed 5000-record bulk expansion.
- Split 7 follow-up tasks:
  - missing canonical classic RAG anchor,
  - fulltext/code readiness pass,
  - experiment-foundation promotion candidates,
  - PaperImplementation shortlist,
  - B6 staged-candidate backlog,
  - classic-theory metadata enrichment,
  - scale-up classifier/taxonomy decision.
- Verified no content-processing side effects and moved the task state to `done`.

## 2026-06-04 - Quality Repair Pass
- Moved Phase 5 and Phase 6 replay tools plus generated evidence into the tracked task bundle:
  - `tools/phase5-judgment-cards.mjs`.
  - `tools/phase6-corpus-readiness.mjs`.
  - `artifacts/phase5-judgment-cards.json`.
  - `artifacts/phase5-judgment-cards-report.json`.
  - `artifacts/phase5-judgment-card-tag-apply-report.json`.
  - `artifacts/phase6-corpus-readiness.json`.
  - `artifacts/phase6-corpus-readiness-report.json`.
  - `artifacts/b6-citation-expansion-stage-report.json`.
  - `artifacts/b6-citation-expansion-candidates.md`.
- Hardened `tools/phase5-judgment-cards.mjs` with explicit modes:
  - default/check: reads DB and prints the summary without writing artifacts or DB tags.
  - `--write`: rewrites tracked artifacts and `10-judgment-cards.md` without DB writes.
  - `--apply`: applies Phase 5 tag updates and writes artifacts.
- Added `tools/priority-reconciliation.mjs` and `12-priority-reconciliation.md` to record the priority-policy decisions.
- Applied priority reconciliation to 18 records; 16 records required tag changes and current-round multi-priority count is now 0.
- Updated `07-seed-catalog.md` for the two promoted experiment-foundation benchmark seeds (`COR-010`, `COR-011`) so seed priority and DB priority agree.
- Refreshed `10-judgment-cards.md` and `11-corpus-readiness-review.md` from tracked tools; Phase 6 now reports 7 follow-up tasks because priority-tag normalization is resolved.
- Verified all repair scripts had zero literature/source/content/pipeline/fulltext side-effect deltas except the intended priority-tag updates.

## Open Questions
- Whether OpenReview/ACL/ACM/USENIX/IEEE entries should be imported manually first or staged through Zotero.
