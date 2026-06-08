# 09 B12 Standard Pipeline Pilot

## Status
- State: implemented through fulltext acquisition, fulltext preprocessing, curated key-content import, chunking, embedding, and indexing.
- Latest B12 run: D63 RAG/test-time clean9 completion.
- Current managed corpus: 352.
- Current effective literature: 352.
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
- Completed D18-D63 curated imports used 0 key-content extraction provider calls.
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

## Latest Counting
- Artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d63-clean9-final-count.json`
- D53 preflight summary: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d53-readonly-preflight-summary.json`
- Theory target artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-after-d52-theory-target-state.json`

| Metric | Value |
| --- | ---: |
| Candidate pool records | 608 |
| Candidate discovered records | 219 |
| Candidate ready-for-promotion records | 18 |
| Candidate promoted records | 209 |
| Candidate deferred records | 15 |
| Managed corpus records | 352 |
| Effective literature records | 352 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Target-qualified theory-support records | 50/50 |

## Next Gate
- Preferred: run one wider source-available selector tranche with the duplicate-anchor fix and D63 test-time tail exclusions enforced.
- Alternative: refill RAG/test-time candidates through narrower source-backed B10 exact-title or arXiv-ID queries before the next apply.
- Keep `LIT-0163`, `LIT-0166`, and `LIT-0257` soft-excluded unless authenticated or user-provided fulltext becomes available.
- Keep future `llm_gateway` key-content retries explicit and bounded.
