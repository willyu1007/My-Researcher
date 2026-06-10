# 09 B12 Standard Pipeline Pilot

## Status
- State: implemented through fulltext acquisition, fulltext preprocessing, curated key-content import, chunking, embedding, and indexing.
- Latest B12 run: D94 existing READY source-stable completion.
- Current managed corpus: 431.
- Current effective literature: 431.
- Current managed blockers: 0.
- Default key-content method: `codex_curated`.

## Entrypoints
- Standard pipeline script: `tools/b12-standard-pipeline-pilot.mjs`
- Fulltext acquisition script: `tools/b12-fulltext-acquisition-pilot.mjs`
- Content backfill script: `tools/b12-content-backfill-pilot.mjs`
- Default mode: dry-run.
- Apply mode: pass `--apply`.

## Standard Pipeline Configuration
- `B12_PIPELINE_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_STAGES`: optional comma-separated stage list.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_POLL_INTERVAL_MS`: polling interval for async runs.
- `B12_POLL_TIMEOUT_MS`: per-run terminal-status timeout.

## Fulltext Acquisition Configuration
- `B12_ACQUISITION_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_EXPLICIT_URLS`: optional `literature_id=source_url` overrides.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_ACQUISITION_MAX_PARALLEL_DOWNLOADS`: download concurrency.
- `B12_ACQUISITION_PROVIDER_CALL_BUDGET`: provider-call budget guard.
- `B12_ACQUISITION_MAX_BYTE_SIZE`: optional maximum raw asset byte size.
- `B12_ACQUISITION_FORCE_REFRESH`: optionally reacquire existing assets.
- `B12_ACQUISITION_POLL_INTERVAL_MS`: polling interval.
- `B12_ACQUISITION_POLL_TIMEOUT_MS`: terminal-status timeout.

## Content Backfill Configuration
- `B12_BACKFILL_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_BACKFILL_TARGET_STAGE`: target stage, default `INDEXED`.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_BACKFILL_MAX_PARALLEL_LITERATURE_RUNS`: literature-level concurrency.
- `B12_BACKFILL_EXTRACTION_CONCURRENCY`: key-content extraction limiter.
- `B12_BACKFILL_EMBEDDING_CONCURRENCY`: embedding limiter.
- `B12_BACKFILL_PROVIDER_CALL_BUDGET`: provider-call budget guard.
- `B12_BACKFILL_POLL_INTERVAL_MS`: polling interval.
- `B12_BACKFILL_POLL_TIMEOUT_MS`: terminal-status timeout.
- `LITERATURE_KEY_CONTENT_READY_METHOD`: default is `codex_curated`.

## Standard Completion Sequence
1. Run standard B12 apply for citation and abstract stages.
2. Expect `FULLTEXT_SOURCE_MISSING` before acquisition for newly promoted source-backed records.
3. Run acquisition dry-run and apply.
4. Rerun standard B12 apply for fulltext preprocessing.
5. Import source-grounded `codex_curated` dossiers.
6. Run content backfill dry-run for `CHUNKED`, `EMBEDDED`, and `INDEXED`.
7. Run content backfill apply.
8. Run a final state probe and B13 count.

## Writes
- Standard apply writes:
  - `LiteraturePipelineState`
  - `LiteraturePipelineStageState`
  - `LiteraturePipelineRun`
  - `LiteraturePipelineRunStep`
  - `LiteratureCitationProfile`
  - `LiteratureAbstractProfile`
- Fulltext acquisition apply writes:
  - `LiteratureFulltextAcquisitionJob`
  - `LiteratureFulltextAcquisitionItem`
  - `LiteratureContentAsset`
- Fulltext preprocessing apply writes:
  - `LiteratureFulltextDocument`
  - `LiteratureFulltextSection`
  - `LiteratureFulltextParagraph`
  - `LiteratureFulltextAnchor`
  - `LiteraturePipelineArtifact`
- Content backfill apply writes:
  - `LiteratureContentProcessingBatchJob`
  - `LiteratureContentProcessingBatchItem`
  - `LiteraturePipelineRun`
  - `LiteraturePipelineRunStep`
  - `LiteraturePipelineStageState`
  - `LiteraturePipelineArtifact`
  - `LiteratureEmbeddingVersion`
  - `LiteratureEmbeddingChunk`
  - `LiteratureEmbeddingTokenIndex`
- Does not write:
  - `LiteratureDiscoveryCandidate`
  - `LiteratureRecord`
  - `LiteratureSource`

## Method Boundary
- `codex_curated` is the default `KEY_CONTENT_READY` path.
- Source-grounded curated dossiers are imported before chunk/embed/index backfill.
- Completed D18-D94 curated imports used 0 key-content extraction provider calls.
- `llm_gateway` extraction remains explicit-only and should be used only for bounded diagnostics or approved retries.

## Completion Ledger

| Run | Literature range | Count | Result |
| --- | --- | ---: | --- |
| D18-D20 | `LIT-0155`-`LIT-0162` subset | 6 | completed via `codex_curated` |
| D22 | blocker cleanup plus `LIT-0252` | 4 | completed; 3 source-access records soft-excluded |
| D25 | arXiv-ready RAG tranche | 6 | completed |
| D29 | test-time arXiv tranche | 12 | completed |
| D30-D40 | source-available tranches3-10 | 88 | completed |
| D42-D43 | RAG/test-time exact-title allowlists | 5 | completed |
| D46-D52 | theory-support target closure | 30 | completed; target reached 50/50 |
| D54 | balanced RAG/test-time source-backed | 6 | completed |
| D55 | source-backed exact-title | 11 | completed |
| D57 | serving/resource-allocation exact-title | 12 | completed |
| D58 | RAG/test-time duplicate-loop rebalance | 4 | completed |
| D59 | serving source-backed curated expansion | 4 | completed |
| D60 | RAG/test-time direction-balance clean6 | 6 | completed |
| D61 | duplicate-anchor fix clean3 | 3 | completed |
| D63 | RAG/test-time source-available clean9 | 9 | completed |
| D64 | wide source-available serving-weighted tranche | 11 | completed |
| D65 | RAG singleton source-backed completion | 1 | completed |
| D66 | test-time exact-ID source-backed small tranche | 4 | completed |
| D67 | test-time existing source-backed small tranche | 4 | completed |
| D68 | source/tail-gated DOI source-available pass | 4 | completed; 15 promoted rows soft-excluded |
| D70 | D69 RAG plus test-time direction-balance | 3 | completed; 1 TechRxiv row soft-excluded |
| D72 | D71 RAG exact-ID source-backed completion | 2 | completed |
| D73 | D72 test-time exact-ID source-backed completion | 3 | completed |
| D74 | math-theory group/action exact-title completion | 4 | completed |
| D75 | balanced RAG/test-time exact-title completion | 6 | completed |
| D77 | D76 curated catalog plus Atom completion | 6 | completed |
| D79 | D78 serving clean2 completion | 2 | completed |
| D81 | D80 test-time exact arXiv completion | 3 | completed |
| D83 | D82 RAG clean2 completion | 2 | completed |
| D86 | D85 theory/strategy source-stable completion | 6 | completed |
| D87 | D85 remaining theory source-stable completion | 5 | completed |
| D89 | D88 ready RAG/theory completion | 2 | completed |
| D91 | D90 RAG-core completion | 2 | completed |
| D93 | D92 ready adjacent-topic completion | 5 | completed |
| D94 | existing READY source-stable completion | 4 | completed |

## D94 Details
- Input: `LIT-0630` through `LIT-0633`.
- Standard apply:
  - citation and abstract stages succeeded for all 4.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 4 explicit `preprints.org` PDF/download requests with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
  - explicit URLs:
    - `LIT-0630`: `https://www.preprints.org/manuscript/202408.2152/v1/download`.
    - `LIT-0631`: `https://www.preprints.org/frontend/manuscript/7cfcfeda2393cefc241f953d6efaf27c/download_pub`.
    - `LIT-0632`: `https://www.preprints.org/manuscript/202402.1702/v1/download`.
    - `LIT-0633`: `https://www.preprints.org/frontend/manuscript/9467916cff347f1f274406f41e2e95b1/download_pub`.
- Fulltext preprocessing:
  - succeeded for all 4 and created 4 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 4 records.
  - import succeeded for all 4.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 4 embedding calls.
  - apply succeeded for all 4.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - `LIT-0630` has 108 embedding chunks.
  - `LIT-0631` has 164 embedding chunks.
  - `LIT-0632` has 50 embedding chunks.
  - `LIT-0633` has 146 embedding chunks.

## D93 Details
- Input: `LIT-0625` through `LIT-0629`.
- Standard apply:
  - citation and abstract stages succeeded for all 5.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 5 explicit arXiv PDF downloads with 0 blockers.
  - apply succeeded for all 5 and created 5 content assets.
  - explicit URLs:
    - `LIT-0625`: `https://arxiv.org/pdf/2403.01136`.
    - `LIT-0626`: `https://arxiv.org/pdf/2409.15104`.
    - `LIT-0627`: `https://arxiv.org/pdf/2605.06914`.
    - `LIT-0628`: `https://arxiv.org/pdf/2507.10150`.
    - `LIT-0629`: `https://arxiv.org/pdf/2407.16212`.
- Fulltext preprocessing:
  - succeeded for all 5 and created 5 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 5 records.
  - import succeeded for all 5.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 5 embedding calls.
  - apply succeeded for all 5.
- Final state:
  - all 5 records have all seven standard stages `SUCCEEDED`.
  - `LIT-0625` has 158 embedding chunks.
  - `LIT-0626` has 149 embedding chunks.
  - `LIT-0627` has 134 embedding chunks.
  - `LIT-0628` has 105 embedding chunks.
  - `LIT-0629` has 561 embedding chunks.

## D91 Details
- Input: `LIT-0623` and `LIT-0624`.
- Standard apply:
  - citation and abstract stages succeeded for both.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 2 explicit arXiv PDF downloads with 0 blockers.
  - apply succeeded for both and created 2 content assets.
  - explicit URLs:
    - `LIT-0623`: `https://arxiv.org/pdf/2212.14024`.
    - `LIT-0624`: `https://arxiv.org/pdf/2211.12561`.
- Fulltext preprocessing:
  - succeeded for both and created 2 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated both records.
  - import succeeded for both.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 2 embedding calls.
  - apply succeeded for both.
- Final state:
  - both records have all seven standard stages `SUCCEEDED`.
  - `LIT-0623` has 147 embedding chunks.
  - `LIT-0624` has 154 embedding chunks.

## D89 Details
- Input: `LIT-0621` and `LIT-0622`.
- Standard apply:
  - citation and abstract stages succeeded for both.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 2 explicit URL downloads with 0 blockers.
  - apply succeeded for both and created 2 content assets.
  - explicit URLs:
    - `LIT-0621`: `https://ojs.aaai.org/index.php/AAAI/article/download/10154/10013`.
    - `LIT-0622`: `https://aclanthology.org/2022.emnlp-main.622.pdf`.
- Fulltext preprocessing:
  - succeeded for both and created 2 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated both records.
  - import succeeded for both.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 2 embedding calls.
  - apply succeeded for both.
- Final state:
  - both records have all seven standard stages `SUCCEEDED`.
  - `LIT-0621` has 112 embedding chunks.
  - `LIT-0622` has 105 embedding chunks.

## D87 Details
- Input: `LIT-0616` through `LIT-0620`.
- Standard apply:
  - citation and abstract stages succeeded for all 5.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 5 explicit URL downloads with 0 blockers.
  - apply succeeded for all 5 and created 5 content assets.
- Fulltext preprocessing:
  - succeeded for all 5 and created 5 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 5.
  - import succeeded for all 5.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 5 embedding calls.
  - apply succeeded for all 5.
- Final state:
  - all 5 records have all seven standard stages `SUCCEEDED`.
  - all 5 have active indexed content.

## D86 Details
- Input: `LIT-0610` through `LIT-0615`.
- Standard apply:
  - citation and abstract stages succeeded for all 6.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 6 explicit URL downloads with 0 blockers.
  - apply succeeded for all 6 and created 6 content assets.
- Fulltext preprocessing:
  - succeeded for all 6 and created 6 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 6.
  - import succeeded for all 6.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 6 embedding calls.
  - apply succeeded for all 6.
- Final state:
  - all 6 records have all seven standard stages `SUCCEEDED`.
  - all 6 have active indexed content.

## D55 Details
- Input: `LIT-0490` through `LIT-0500`.
- Standard apply:
  - citation and abstract stages succeeded for all 11.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 11 arXiv downloads with 0 blockers.
  - apply succeeded for all 11 and created 11 content assets.
- Fulltext preprocessing:
  - succeeded for all 11 and created 11 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 11.
  - import succeeded for all 11.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 11 embedding calls.
  - apply succeeded for all 11.
- Final state:
  - all 11 records have all seven standard stages `SUCCEEDED`.
  - all 11 have active and indexed embedding versions.

## D57 Details
- Input: `LIT-0501` through `LIT-0512`.
- Standard apply:
  - citation and abstract stages succeeded for all 12.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 12 arXiv downloads with 0 blockers.
  - apply succeeded for all 12 and created 12 content assets.
- Fulltext preprocessing:
  - succeeded for all 12 and created 12 ready fulltext documents.
- Key-content:
  - source-grounded serving-aware `codex_curated` dossier dry-run validated all 12.
  - import succeeded for all 12.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 12 embedding calls.
  - apply succeeded for all 12.
- Final state:
  - all 12 records have all seven standard stages `SUCCEEDED`.
  - all 12 have active and indexed embedding versions.

## D58 Details
- Input: `LIT-0513` through `LIT-0516`.
- Standard apply:
  - citation and abstract stages succeeded for all 4.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 3 arXiv downloads and 1 Unpaywall acquisition with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
- Fulltext preprocessing:
  - succeeded for all 4 and created 4 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 4.
  - import succeeded for all 4.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 4 embedding calls.
  - apply succeeded for all 4.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - all 4 have active and indexed embedding versions.

## D59 Details
- Input: `LIT-0517` through `LIT-0520`.
- Standard apply:
  - citation and abstract stages succeeded for all 4.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 4 arXiv downloads with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
- Fulltext preprocessing:
  - succeeded for all 4 and created 4 ready fulltext documents.
- Key-content:
  - source-grounded serving-aware `codex_curated` dossier dry-run validated all 4.
  - import succeeded for all 4.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated calls: 0 extraction calls and 4 embedding calls.
  - apply succeeded for all 4.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk/vector counts: `LIT-0517` 133, `LIT-0518` 183, `LIT-0519` 204, `LIT-0520` 153.

## D60 Details
- Input: `LIT-0521` through `LIT-0526`.
- Standard apply:
  - citation and abstract stages succeeded for all 6.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 6 Unpaywall acquisitions with 0 blockers.
  - first apply succeeded for 5 and failed `LIT-0525` with `UNPAYWALL_NO_OA_PDF`.
  - explicit arXiv acquisition for `LIT-0525` dry-run had 0 blockers and apply succeeded.
  - total content assets created: 6.
- Fulltext preprocessing:
  - succeeded for all 6 and created 6 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 6.
  - import succeeded for all 6.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - standard pipeline apply succeeded for `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 6.
- Final state:
  - all 6 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk/vector counts: `LIT-0521` 115, `LIT-0522` 126, `LIT-0523` 148, `LIT-0524` 140, `LIT-0525` 290, `LIT-0526` 146.

## D61 Details
- Input: `LIT-0527` through `LIT-0529`.
- Standard apply:
  - citation and abstract stages succeeded for all 3.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 3 Unpaywall acquisitions with 0 blockers.
  - apply succeeded for all 3 and created 3 content assets.
- Fulltext preprocessing:
  - succeeded for all 3 and created 3 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 3.
  - import succeeded for all 3.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - standard pipeline apply succeeded for `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 3.
- Final state:
  - all 3 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk/vector counts: `LIT-0527` 202, `LIT-0528` 155, `LIT-0529` 180.

## D63 Details
- Input: `LIT-0530` through `LIT-0538`.
- Standard apply:
  - citation and abstract stages succeeded for all 9.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 7 Unpaywall acquisitions and 2 arXiv downloads with 0 blockers.
  - apply succeeded for all 9 and created 9 content assets.
- Fulltext preprocessing:
  - succeeded for all 9 and created 9 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 9.
  - import succeeded for all 9.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - standard pipeline apply succeeded for `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 9.
- Final state:
  - all 9 records have all seven standard stages `SUCCEEDED`.
  - all 9 have active embedding versions, indexed vectors, fulltext documents, and content assets.
  - embedding chunk/vector counts: `LIT-0530` 119, `LIT-0531` 144, `LIT-0532` 96, `LIT-0533` 134, `LIT-0534` 86, `LIT-0535` 110, `LIT-0536` 71, `LIT-0537` 144, `LIT-0538` 108.

## D64 Details
- Input: `LIT-0539` through `LIT-0549`.
- Standard apply:
  - citation and abstract stages succeeded for all 11.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 8 arXiv downloads and 3 Unpaywall acquisitions with 0 blockers.
  - apply succeeded for all 11 and created 11 content assets.
- Fulltext preprocessing:
  - succeeded for all 11 and created 11 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 11.
  - import succeeded for all 11.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - standard pipeline apply succeeded for `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 11.
- Final state:
  - all 11 records have all seven standard stages `SUCCEEDED`.
  - all 11 have active embedding versions, indexed vectors, fulltext documents, and content assets.
  - embedding chunk/vector counts: `LIT-0539` 149, `LIT-0540` 108, `LIT-0541` 164, `LIT-0542` 182, `LIT-0543` 197, `LIT-0544` 217, `LIT-0545` 159, `LIT-0546` 103, `LIT-0547` 91, `LIT-0548` 124, `LIT-0549` 103.

## D65 Details
- Input: `LIT-0550`.
- Standard apply:
  - citation and abstract stages succeeded.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 1 arXiv download with 0 blockers.
  - apply succeeded and created 1 content asset.
- Fulltext preprocessing:
  - succeeded and created 1 ready fulltext document.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated the record.
  - import succeeded.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - content backfill apply succeeded for `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 1.
- Final state:
  - all seven standard stages are `SUCCEEDED`.
  - active embedding version: `eba36415-a43d-44cd-a48a-b33d62d83133`.
  - embedding chunk/vector counts: `LIT-0550` 107.

## D66 Details
- Input: `LIT-0551` through `LIT-0554`.
- Standard apply:
  - citation and abstract stages succeeded for all 4.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 4 arXiv downloads with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
- Fulltext preprocessing:
  - succeeded for all 4 and created 4 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 4.
  - import succeeded for all 4.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - content backfill apply succeeded for `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 4.
  - estimated extraction calls: 0.
  - estimated embedding calls: 4.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk/vector counts: `LIT-0551` 140, `LIT-0552` 70, `LIT-0553` 118, `LIT-0554` 145.

## D67 Details
- Input: `LIT-0555` through `LIT-0558`.
- Standard apply:
  - citation and abstract stages succeeded for all 4.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 4 arXiv downloads with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
- Fulltext preprocessing:
  - succeeded for all 4 and created 4 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 4.
  - import succeeded for all 4.
  - extraction provider calls: 0.
  - source-ref repairs: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 4.
  - content backfill apply succeeded for all 4.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk counts: `LIT-0555` 304, `LIT-0556` 170, `LIT-0557` 178, `LIT-0558` 168.

## D68 Details
- Input:
  - initial broad DOI apply: `LIT-0559` through `LIT-0573`.
  - current final host-gated selected apply: `LIT-0576`.
  - excluded after acquisition or apply hygiene: `LIT-0559`-`LIT-0563`, `LIT-0566`-`LIT-0569`, `LIT-0571`-`LIT-0575`, and `LIT-0577`.
- Acquisition:
  - initial 15-record acquisition succeeded for `LIT-0564`, `LIT-0565`, and `LIT-0570`; 12 records failed with non-PDF, 403, 404, or no-OA-PDF outcomes and were soft-excluded.
  - final current selector acquisition succeeded for `LIT-0576`; `LIT-0577` failed with HTTP 403 from `direct.mit.edu` and was soft-excluded.
- Fulltext preprocessing:
  - succeeded for `LIT-0564`, `LIT-0565`, `LIT-0570`, and `LIT-0576`.
- Key-content:
  - source-grounded `codex_curated` dossier dry-runs validated all 4 completed records.
  - imports succeeded for all 4.
  - extraction provider calls: 0.
- Index backfill:
  - dry-runs planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 4 total.
  - content backfill apply succeeded for all 4 completed records.
- Final state:
  - managed/effective corpus reached 376/376.
  - managed incomplete, blocked, and not-started counts are all 0.
  - excluded non-corpus records reached 24.

## D70 Details
- Input:
  - D69 RAG records: `LIT-0578` and `LIT-0579`.
  - direction-balance TechRxiv singleton: `LIT-0580`.
  - clean test-time exact-title record: `LIT-0581`.
- Acquisition:
  - `LIT-0578` and `LIT-0579` used arXiv acquisition and created 2 content assets.
  - `LIT-0580` used an OpenAlex/Unpaywall TechRxiv PDF URL; acquisition failed with HTTP 403 from a Cloudflare-protected source and created no asset.
  - `LIT-0581` used arXiv acquisition and created 1 content asset.
- Cleanup:
  - `LIT-0580` was soft-excluded with `classification:excluded-from-corpus`, `exclusion:source-access-403`, and `exclusion:techrxiv-cloudflare-challenge`.
- Fulltext preprocessing:
  - succeeded for `LIT-0578`, `LIT-0579`, and `LIT-0581`.
- Key-content:
  - source-grounded `codex_curated` dossier dry-runs validated all 3 completed records.
  - imports succeeded for all 3 completed records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-runs planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 3 total.
  - content backfill apply succeeded for all 3 completed records.
- Final state:
  - managed/effective corpus reached 379/379.
  - managed incomplete, blocked, and not-started counts are all 0.
  - excluded non-corpus records reached 25.

## D72 Details
- Input:
  - D71 RAG records: `LIT-0582` and `LIT-0583`.
- Standard apply:
  - citation and abstract stages succeeded for both records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 2 arXiv downloads with 0 blockers.
  - apply succeeded for both and created 2 content assets.
- Fulltext preprocessing:
  - succeeded for both records and created 2 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated both records.
  - imports succeeded for both records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 2 total.
  - content backfill apply succeeded for both records.
- Final state:
  - all 2 records have all seven standard stages `SUCCEEDED`.
  - embedding chunk counts: `LIT-0582` 127 and `LIT-0583` 137.
  - indexed token counts: `LIT-0582` 1407 and `LIT-0583` 1387.
  - managed/effective corpus reached 381/381.
  - managed incomplete, blocked, and not-started counts are all 0.

## D73 Details
- Input: `LIT-0584` through `LIT-0586`.
- Standard apply:
  - citation and abstract stages succeeded for all 3 records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 3 arXiv downloads with 0 blockers.
  - apply succeeded for all 3 and created 3 content assets.
- Fulltext preprocessing:
  - succeeded for all 3 records and created 3 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 3 records.
  - imports succeeded for all 3 records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 3 total.
  - content backfill apply succeeded for all 3 records.
- Final state:
  - all 3 records have all seven standard stages `SUCCEEDED`.
  - all 3 have one content asset, one fulltext document, and embedding chunks.
  - managed/effective corpus reached 384/384.
  - managed incomplete, blocked, and not-started counts are all 0.

## D74 Details
- Input: `LIT-0587` through `LIT-0590`.
- Standard apply:
  - citation and abstract stages succeeded for all 4 records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 4 arXiv downloads with 0 blockers.
  - apply succeeded for all 4 and created 4 content assets.
- Fulltext preprocessing:
  - succeeded for all 4 records and created 4 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 4 records.
  - imports succeeded for all 4 records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 4 total.
  - content backfill apply succeeded for all 4 records.
- Final state:
  - all 4 records have all seven standard stages `SUCCEEDED`.
  - all 4 have one content asset, one fulltext document, and embedding chunks.
  - managed/effective corpus reached 388/388.
  - managed incomplete, blocked, and not-started counts are all 0.

## D75 Details
- Input: `LIT-0591` through `LIT-0596`.
- Standard apply:
  - citation and abstract stages succeeded for all 6 records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 6 arXiv downloads with 0 blockers.
  - apply succeeded for all 6 and created 6 content assets.
- Fulltext preprocessing:
  - succeeded for all 6 records and created 6 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 6 records.
  - imports succeeded for all 6 records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 6 total.
  - content backfill apply succeeded for all 6 records.
- Final state:
  - all 6 records have all seven standard stages `SUCCEEDED`.
  - all 6 have one content asset, one fulltext document, and embedding chunks.
  - managed/effective corpus reached 394/394.
  - managed incomplete, blocked, and not-started counts are all 0.

## D77 Details
- Input: `LIT-0597` through `LIT-0602`.
- Standard apply:
  - citation and abstract stages succeeded for all 6 records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 6 arXiv downloads with 0 blockers.
  - apply succeeded for all 6 and created 6 content assets.
- Fulltext preprocessing:
  - succeeded for all 6 records and created 6 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 6 records.
  - imports succeeded for all 6 records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 6 total.
  - content backfill apply succeeded for all 6 records.
- Final state:
  - all 6 records have all seven standard stages `SUCCEEDED`.
  - all 6 have one content asset and one fulltext document.
  - embedding chunk counts: `LIT-0597` 109, `LIT-0598` 160, `LIT-0599` 126, `LIT-0600` 158, `LIT-0601` 115, `LIT-0602` 120.
  - managed/effective corpus reached 400/400.
  - managed incomplete, blocked, and not-started counts are all 0.

## D79 Details
- Input: `LIT-0603` and `LIT-0604`.
- Standard apply:
  - citation and abstract stages succeeded for both records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 2 arXiv downloads with 0 blockers.
  - apply succeeded for both and created 2 content assets.
- Fulltext preprocessing:
  - succeeded for both records and created 2 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated both records.
  - imports succeeded for both records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 2 total.
  - content backfill apply succeeded for both records.
- Final state:
  - both records have all seven standard stages `SUCCEEDED`.
  - both have one content asset and one fulltext document.
  - embedding chunk counts: `LIT-0603` 176, `LIT-0604` 176.
  - managed/effective corpus reached 402/402.
  - managed incomplete, blocked, and not-started counts are all 0.

## D81 Details
- Input: `LIT-0605` through `LIT-0607`.
- Standard apply:
  - citation and abstract stages succeeded for all 3 records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 3 arXiv downloads with 0 blockers.
  - apply succeeded for all 3 and created 3 content assets.
- Fulltext preprocessing:
  - succeeded for all 3 records and created 3 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated all 3 records.
  - imports succeeded for all 3 records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 3 total.
  - content backfill apply succeeded for all 3 records.
- Final state:
  - all 3 records have all seven standard stages `SUCCEEDED`.
  - all 3 have one content asset and one fulltext document.
  - embedding chunk counts: `LIT-0605` 78, `LIT-0606` 202, `LIT-0607` 182.
  - managed/effective corpus reached 405/405.
  - managed incomplete, blocked, and not-started counts are all 0.

## D83 Details
- Input: `LIT-0608` and `LIT-0609`.
- Standard apply:
  - citation and abstract stages succeeded for both records.
  - fulltext preprocessing initially blocked with expected `FULLTEXT_SOURCE_MISSING`.
- Acquisition:
  - dry-run planned 2 arXiv downloads with 0 blockers.
  - apply succeeded for both and created 2 content assets.
- Fulltext preprocessing:
  - succeeded for both records and created 2 ready fulltext documents.
- Key-content:
  - source-grounded `codex_curated` dossier dry-run validated both records.
  - imports succeeded for both records.
  - extraction provider calls: 0.
- Index backfill:
  - dry-run planned only `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - estimated extraction calls: 0.
  - estimated embedding calls: 2 total.
  - content backfill apply succeeded for both records.
- Final state:
  - both records have all seven standard stages `SUCCEEDED`.
  - both have one content asset and one fulltext document.
  - embedding chunk counts: `LIT-0608` 146, `LIT-0609` 111.
  - managed/effective corpus reached 407/407.
  - managed incomplete, blocked, and not-started counts are all 0.

## Latest Counting
- Artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d94-after-b12.json`
- D53 preflight summary: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d53-readonly-preflight-summary.json`
- Theory target artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-after-d52-theory-target-state.json`

| Metric | Value |
| --- | ---: |
| Candidate pool records | 674 |
| Candidate discovered records | 0 |
| Candidate ready-for-promotion records | 77 |
| Candidate promoted records | 304 |
| Candidate duplicate records | 139 |
| Candidate deferred records | 134 |
| Candidate rejected records | 20 |
| Managed corpus records | 431 |
| Effective literature records | 431 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Target-qualified theory-support records | 54/50 |

## Next Gate
- Preferred: continue small exact-title/source-backed RAG/test-time refills when aiming for effective-literature growth; use broad B10 expansion when candidate-pool growth becomes the priority.
- Keep D68 blocked hosts excluded from broad DOI selector output unless B12 acquisition/download behavior changes.
- Keep soft-excluded records excluded unless authenticated or user-provided fulltext becomes available.
- Keep future `llm_gateway` key-content retries explicit and bounded.
