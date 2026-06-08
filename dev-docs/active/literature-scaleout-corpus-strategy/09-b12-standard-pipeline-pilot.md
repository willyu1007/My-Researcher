# 09 B12 Standard Pipeline Pilot

## Status
- State: implemented through fulltext acquisition, fulltext preprocessing, curated key-content import, chunking, embedding, and indexing.
- Latest B12 run: D57 serving/resource-allocation exact-title completion.
- Current managed corpus: 326.
- Current effective literature: 326.
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
- Completed D18-D57 curated imports used 0 key-content extraction provider calls.
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

## Latest Counting
- Artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-after-d57-serving.json`
- D53 preflight summary: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d53-readonly-preflight-summary.json`
- Theory target artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-after-d52-theory-target-state.json`

| Metric | Value |
| --- | ---: |
| Candidate pool records | 600 |
| Candidate discovered records | 233 |
| Candidate ready-for-promotion records | 23 |
| Candidate promoted records | 183 |
| Candidate deferred records | 11 |
| Managed corpus records | 326 |
| Effective literature records | 326 |
| Pipeline incomplete records | 0 |
| Pipeline blocked records | 0 |
| Pipeline not-started records | 0 |
| Target-qualified theory-support records | 50/50 |

## Next Gate
- Preferred: run a RAG/test-time exact-title/source-backed B10 -> B11 -> B12 tranche to rebalance after D57.
- Alternative: run broader B10 catalog expansion for recall, then gate B11/B12 on source availability and tail filters.
- Keep `LIT-0163`, `LIT-0166`, and `LIT-0257` soft-excluded unless authenticated or user-provided fulltext becomes available.
- Keep future `llm_gateway` key-content retries explicit and bounded.
