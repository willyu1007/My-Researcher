# 09 B12 Standard Pipeline Pilot

## Status
- State: B12 pilot implemented through fulltext acquisition, fulltext preprocessing, content backfill, and blocker cleanup.
- Standard pilot apply: completed for the 10 B11-promoted records.
- Fulltext acquisition apply: completed for the same 10 records.
- Fulltext preprocessing rerun: completed for the same 10 records.
- Full 80-120 effective-literature run: gated on source availability and curated key-content throughput; default method is now `codex_curated`, with `llm_gateway` retries explicit-only.

## Entrypoint
- Script: `tools/b12-standard-pipeline-pilot.mjs`
- Fulltext acquisition script: `tools/b12-fulltext-acquisition-pilot.mjs`
- Content backfill script: `tools/b12-content-backfill-pilot.mjs`
- Default mode: dry-run.
- Apply mode: pass `--apply`.
- Default trigger source: `BACKFILL`.
- Default requested stages:
  - `CITATION_NORMALIZED`
  - `ABSTRACT_READY`
  - `FULLTEXT_PREPROCESSED`

## Configuration
- `B12_PIPELINE_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_STAGES`: optional comma-separated standard stage list.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_POLL_INTERVAL_MS`: polling interval for async content-processing runs.
- `B12_POLL_TIMEOUT_MS`: per-run terminal-status timeout.

## Fulltext Acquisition Configuration
- `B12_ACQUISITION_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_EXPLICIT_URLS`: optional comma-separated `literature_id=source_url` overrides.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_ACQUISITION_MAX_PARALLEL_DOWNLOADS`: download concurrency.
- `B12_ACQUISITION_PROVIDER_CALL_BUDGET`: provider-call budget guard.
- `B12_ACQUISITION_MAX_BYTE_SIZE`: optional maximum raw asset byte size.
- `B12_ACQUISITION_FORCE_REFRESH`: optionally reacquire existing assets.
- `B12_ACQUISITION_POLL_INTERVAL_MS`: polling interval for acquisition jobs.
- `B12_ACQUISITION_POLL_TIMEOUT_MS`: terminal-status timeout.

## Content Backfill Configuration
- `B12_BACKFILL_RUN_ID`: run id used in artifacts.
- `B12_BATCH_ID`: optional candidate batch id filter.
- `B12_BATCH_CODE`: optional candidate batch code filter.
- `B12_LITERATURE_IDS`: optional comma-separated explicit literature ids.
- `B12_BACKFILL_TARGET_STAGE`: target stage, default `INDEXED`.
- `B12_MAX_RECORDS`: maximum promoted records selected when no explicit ids are provided.
- `B12_BACKFILL_MAX_PARALLEL_LITERATURE_RUNS`: literature-level concurrency.
- `B12_BACKFILL_EXTRACTION_CONCURRENCY`: stage limiter for key-content extraction.
- `B12_BACKFILL_EMBEDDING_CONCURRENCY`: stage limiter for embedding.
- `B12_BACKFILL_SECTION_CONCURRENCY`: local extraction override; default is 1 for the pilot runner.
- `B12_BACKFILL_EXTRACTION_REQUEST_TIMEOUT_MS`: optional local extraction request-timeout override.
- `B12_BACKFILL_CONTENT_RUN_TIMEOUT_MS`: optional per-content-processing-run timeout override.
- `B12_BACKFILL_PROVIDER_CALL_BUDGET`: provider-call budget guard.
- `B12_BACKFILL_POLL_INTERVAL_MS`: polling interval for backfill jobs.
- `B12_BACKFILL_POLL_TIMEOUT_MS`: terminal-status timeout.
- `LITERATURE_KEY_CONTENT_READY_METHOD`: default `KEY_CONTENT_READY` method; current environment default is `codex_curated`.

## Writes
- Dry-run writes:
  - JSON report artifacts only.
- Apply writes:
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

## Pilot Dry Run
- Artifact: `artifacts/20260606T-b12-standard-pipeline-dry-run-b12-standard-pipeline-pilot-report.json`
- Input:
  - batch id: `0caeeefb-735f-410d-aa88-7fedc187c6f3`
  - max records: 10
  - selected records: 10
- Result:
  - `CITATION_NORMALIZED`: 10 `NOT_STARTED`.
  - `ABSTRACT_READY`: 10 `NOT_STARTED`.
  - `FULLTEXT_PREPROCESSED`: 10 `NOT_STARTED`.
  - content assets: 0.
  - fulltext documents: 0.
  - DB delta: 0.

## Pilot Apply
- Artifact: `artifacts/20260606T-b12-standard-pipeline-apply-b12-standard-pipeline-pilot-report.json`
- Command:

```bash
TS_NODE_TRANSPILE_ONLY=true B12_PIPELINE_RUN_ID=20260606T-b12-standard-pipeline-apply \
  B12_BATCH_ID=0caeeefb-735f-410d-aa88-7fedc187c6f3 \
  B12_MAX_RECORDS=10 B12_POLL_TIMEOUT_MS=60000 \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/literature-scaleout-corpus-strategy/tools/b12-standard-pipeline-pilot.mjs \
  --apply
```

- Result:
  - selected records: 10.
  - pipeline runs created: 10.
  - run status: 10 `PARTIAL`.
  - `CITATION_NORMALIZED`: 10 `SUCCEEDED`.
  - `ABSTRACT_READY`: 10 `SUCCEEDED`.
  - `FULLTEXT_PREPROCESSED`: 10 `BLOCKED`.
  - blocker reason: 10 `FULLTEXT_SOURCE_MISSING`.
  - content assets: 0.
  - fulltext documents: 0.

## Fulltext Acquisition Dry Run
- Artifact: `artifacts/20260606T-b12-fulltext-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
- Input:
  - batch id: `0caeeefb-735f-410d-aa88-7fedc187c6f3`
  - max records: 10
  - selected records: 10
- Result:
  - planned items: 10.
  - blocked items: 0.
  - source split: 8 arXiv, 2 Unpaywall.
  - estimated provider calls: 2 Unpaywall calls and 10 download calls.
  - DB delta: 0.

## Fulltext Acquisition Apply
- Artifact: `artifacts/20260606T-b12-fulltext-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
- Result:
  - job status: `SUCCEEDED`.
  - items: 10 `SUCCEEDED`.
  - content assets created: 10.
  - blocked items: 0.

## Fulltext Preprocessing Rerun
- First rerun artifact: `artifacts/20260606T-b12-fulltext-preprocess-after-acquisition-b12-standard-pipeline-pilot-report.json`
- Final rerun artifact: `artifacts/20260606T-b12-fulltext-preprocess-after-settings-fix-b12-standard-pipeline-pilot-report.json`
- Fix:
  - `tools/b12-standard-pipeline-pilot.mjs` now instantiates `LiteratureContentProcessingSettingsService`.
  - This makes GROBID and content-processing settings available to `LiteratureFlowService`.
- Result:
  - selected records: 10.
  - pipeline runs created: 10.
  - run status: 10 `SUCCESS`.
  - `FULLTEXT_PREPROCESSED`: 10 `SUCCEEDED`.
  - records with content assets: 10.
  - records with fulltext documents: 10.

## Content Backfill Dry Runs
- Full batch artifact: `artifacts/20260606T-b12-content-backfill-dry-run-b12-content-backfill-pilot-report.json`
- Remaining-record artifact: `artifacts/20260606T-b12-content-backfill-remaining-dry-run-b12-content-backfill-pilot-report.json`
- Result:
  - full batch dry-run selected 10 records and planned 10 items.
  - remaining-record dry-run selected 8 records and planned 8 items after `LIT-0160` succeeded and `LIT-0158` failed.
  - planned stages: `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - dry-run blockers: 0.
  - estimated provider calls for full batch: 10 extraction calls and 10 embedding calls.

## Content Backfill Applies
- The first apply created a content-processing batch job, completed `LIT-0160` through `INDEXED`, then was stopped after `LIT-0158` exceeded the expected key-content provider progress window.
- Cleanup result after first apply:
  - job status: `FAILED`.
  - items: 1 `SUCCEEDED`, 1 `FAILED`, 8 `CANCELED`.
  - `LIT-0160`: `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` all `SUCCEEDED`.
  - `LIT-0158`: `KEY_CONTENT_READY` `FAILED` with `B12_BACKFILL_PROVIDER_TIMEOUT_INTERRUPTED`.
- The second apply targeted the remaining 8 records with `B12_BACKFILL_SECTION_CONCURRENCY=1`, then was stopped after `LIT-0153` exceeded the expected key-content provider progress window.
- Cleanup result after second apply:
  - job status: `FAILED`.
  - items: 1 `FAILED`, 7 `CANCELED`.
  - `LIT-0153`: `KEY_CONTENT_READY` `FAILED` with `B12_BACKFILL_PROVIDER_TIMEOUT_INTERRUPTED`.
- Apply artifacts were not produced for the interrupted content-backfill runs because the local runner process was stopped before it returned to artifact writing.
- Current runner mitigation:
  - `tools/b12-content-backfill-pilot.mjs` now exposes `B12_BACKFILL_CONTENT_RUN_TIMEOUT_MS`.
  - The pilot runner defaults `B12_BACKFILL_SECTION_CONCURRENCY` to 1.
- Timeout cleanup fix:
  - `LIT-0153` one-record retry showed that the batch job can fail and write an artifact while the underlying pipeline run remains `RUNNING`.
  - the pilot runner now detects timed-out content-processing runs, terminalizes the corresponding pipeline run/step/stage with `B12_BACKFILL_CONTENT_RUN_TIMEOUT`, and exits cleanly after writing artifacts.
  - verification run artifact: `artifacts/20260606T-b12-keycontent-retry-lit0153-cleanup-fix-apply-b12-content-backfill-pilot-report.json`.
  - verification result: `timeout_cleanup_count=1`, `timeout_cleanup_terminalized_runs=1`, and no residual running B12 job/run.
- Non-blocker retry:
  - `LIT-0154` was retried from `KEY_CONTENT_READY=NOT_STARTED`.
  - dry-run artifact: `artifacts/20260606T-b12-keycontent-retry-lit0154-dry-run-b12-content-backfill-pilot-report.json`.
  - apply artifact: `artifacts/20260606T-b12-keycontent-retry-lit0154-apply-b12-content-backfill-pilot-report.json`.
  - apply result: `FAILED` with `B12_BACKFILL_CONTENT_RUN_TIMEOUT`; cleanup reported `timeout_cleanup_count=1` and `timeout_cleanup_terminalized_runs=1`.
  - no residual running B12 job/run remained after the retry.
- Provider timeout diagnosis:
  - minimal OpenAI `gpt-5.5` gateway canary passed in 3397ms, so credentials/model/gateway minimum path is available.
  - real `LIT-0154` max-section key-content prompt timed out at 45003ms with high reasoning and passed in 31096ms with low reasoning.
  - section-level key-content extraction now uses low reasoning; paper-level consolidation keeps high reasoning.
  - backfill dry-run now estimates key-content provider calls from ready fulltext sections plus consolidation.
  - diagnostic dry-run artifact: `artifacts/20260606T-b12-provider-timeout-diagnosis-dry-run-b12-content-backfill-pilot-report.json`.
  - diagnostic dry-run result for `LIT-0154`: 42 estimated extraction calls and 15s margin between a 45s single-section request window and a 60s content-run timeout.
- Default method switch:
  - code, env contract/values, local `.env.local`, OpenAPI context, and local dev DB settings now default `preferred_key_content_method` to `codex_curated`.
  - default `KEY_CONTENT_READY` backfill should block as `KEY_CONTENT_CURATION_REQUIRED` until a curated dossier is imported.
  - the provider timeout path applies only when `llm_gateway` is explicitly selected.
- `codex_curated` happy-path canary:
  - `LIT-0155` bundle export artifact: `artifacts/20260607T-b12-codex-curated-lit0155-bundle-export.json`.
  - dossier dry-run artifact: `artifacts/20260607T-b12-codex-curated-lit0155-dossier-dry-run.json`.
  - post-import state artifact: `artifacts/20260607T-b12-codex-curated-lit0155-post-import-state.json`.
  - index dry-run artifact: `artifacts/20260607T-b12-codex-curated-lit0155-index-dry-run-b12-content-backfill-pilot-report.json`.
  - index apply artifact: `artifacts/20260607T-b12-codex-curated-lit0155-index-apply-b12-content-backfill-pilot-report.json`.
  - final state artifact: `artifacts/20260607T-after-b12-codex-curated-lit0155-index-state.json`.
  - counting artifact: `artifacts/20260607T-after-b12-codex-curated-lit0155-index.json`.
  - result: `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` all succeeded; key-content import reported 0 LLM gateway calls.
- `codex_curated` two-record batch:
  - `LIT-0156` bundle export artifact: `artifacts/20260607T-b12-codex-curated-batch2-lit-0156-bundle-export.json`.
  - `LIT-0157` bundle export artifact: `artifacts/20260607T-b12-codex-curated-batch2-lit-0157-bundle-export.json`.
  - dossier dry-run artifact: `artifacts/20260607T-b12-codex-curated-batch2-dossier-dry-run.json`.
  - dossier import artifact: `artifacts/20260607T-b12-codex-curated-batch2-dossier-import.json`.
  - post-import state artifact: `artifacts/20260607T-b12-codex-curated-batch2-post-import-state.json`.
  - index dry-run artifact: `artifacts/20260607T-b12-codex-curated-batch2-index-dry-run-b12-content-backfill-pilot-report.json`.
  - index apply artifact: `artifacts/20260607T-b12-codex-curated-batch2-index-apply-b12-content-backfill-pilot-report.json`.
  - final state artifact: `artifacts/20260607T-after-b12-codex-curated-batch2-index-state.json`.
  - counting artifact: `artifacts/20260607T-after-b12-codex-curated-batch2-index.json`.
  - result: `LIT-0156` and `LIT-0157` imported source-grounded curated dossiers with 0 key-content provider calls, then completed `CHUNKED`, `EMBEDDED`, and `INDEXED`.
- `codex_curated` three-record batch:
  - `LIT-0159` bundle export artifact: `artifacts/20260607T-b12-codex-curated-batch3-lit-0159-bundle-export.json`.
  - `LIT-0161` bundle export artifact: `artifacts/20260607T-b12-codex-curated-batch3-lit-0161-bundle-export.json`.
  - `LIT-0162` bundle export artifact: `artifacts/20260607T-b12-codex-curated-batch3-lit-0162-bundle-export.json`.
  - dossier dry-run artifact: `artifacts/20260607T-b12-codex-curated-batch3-dossier-dry-run.json`.
  - dossier import artifact: `artifacts/20260607T-b12-codex-curated-batch3-dossier-import.json`.
  - post-import state artifact: `artifacts/20260607T-b12-codex-curated-batch3-post-import-state.json`.
  - index dry-run artifact: `artifacts/20260607T-b12-codex-curated-batch3-index-dry-run-b12-content-backfill-pilot-report.json`.
  - index apply artifact: `artifacts/20260607T-b12-codex-curated-batch3-index-apply-b12-content-backfill-pilot-report.json`.
  - final state artifact: `artifacts/20260607T-after-b12-codex-curated-batch3-index-state.json`.
  - counting artifact: `artifacts/20260607T-after-b12-codex-curated-batch3-index.json`.
  - result: `LIT-0159`, `LIT-0161`, and `LIT-0162` imported source-grounded curated dossiers with 0 key-content provider calls, then completed `CHUNKED`, `EMBEDDED`, and `INDEXED`.
- Opportunity tranche2:
  - B11 promoted `LIT-0163` through `LIT-0166`.
  - standard apply artifact: `artifacts/20260607T-b12-opportunity-tranche2-standard-apply-b12-standard-pipeline-pilot-report.json`.
  - acquisition apply artifact: `artifacts/20260607T-b12-opportunity-tranche2-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`.
  - fulltext preprocess artifact: `artifacts/20260607T-b12-opportunity-tranche2-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`.
  - curation bundle artifacts: `artifacts/20260607T-b12-codex-curated-opportunity-tranche2-lit-0164-bundle-export.json` and `artifacts/20260607T-b12-codex-curated-opportunity-tranche2-lit-0165-bundle-export.json`.
  - dossier dry-run artifact: `artifacts/20260607T-b12-codex-curated-opportunity-tranche2-dossier-dry-run.json`.
  - dossier import artifact: `artifacts/20260607T-b12-codex-curated-opportunity-tranche2-dossier-import.json`.
  - index apply artifact: `artifacts/20260607T-b12-codex-curated-opportunity-tranche2-index-apply-b12-content-backfill-pilot-report.json`.
  - final state artifact: `artifacts/20260607T-after-b12-opportunity-tranche2-index-state.json`.
  - counting artifact: `artifacts/20260607T-after-b12-opportunity-tranche2-index.json`.
  - result: `LIT-0164` and `LIT-0165` completed through `INDEXED`; `LIT-0163` and `LIT-0166` became fulltext-source blockers after acquisition failures.
- Blocker cleanup:
  - key-content bundle artifacts:
    - `artifacts/20260607T-b12-blocker-clear-keycontent-bundle-export-lit-0153-bundle-export.json`
    - `artifacts/20260607T-b12-blocker-clear-keycontent-bundle-export-lit-0154-bundle-export.json`
    - `artifacts/20260607T-b12-blocker-clear-keycontent-bundle-export-lit-0158-bundle-export.json`
  - key-content dossier dry-run artifact: `artifacts/20260607T-b12-blocker-clear-keycontent-dossier-dry-run.json`.
  - key-content dossier import artifact: `artifacts/20260607T-b12-blocker-clear-keycontent-dossier-import.json`.
  - key-content index apply artifact: `artifacts/20260607T-b12-blocker-clear-keycontent-index-apply-b12-content-backfill-pilot-report.json`.
  - result: `LIT-0153`, `LIT-0154`, and `LIT-0158` imported source-grounded `codex_curated` dossiers and completed through `INDEXED`; estimated key-content extraction calls were 0 and embedding calls were 3.
  - `LIT-0166` wrong-source cleanup artifact: `artifacts/20260607T-b12-blocker-clear-lit0166-wrong-source-cleanup.json`.
  - result: arXiv `2506.05871` was rejected because the PDF title/content is `BestServe`, not `WindServe`; the content asset, fulltext document, pipeline artifact, and wrong-source files were removed, and `LIT-0166` was restored to `FULLTEXT_SOURCE_MISSING`.
  - `LIT-0252` explicit PDF acquisition dry-run/apply artifacts:
    - `artifacts/20260607T-b12-blocker-clear-lit0252-explicit-psu-dry-run-b12-fulltext-acquisition-pilot-report.json`
    - `artifacts/20260607T-b12-blocker-clear-lit0252-explicit-psu-apply-b12-fulltext-acquisition-pilot-report.json`
  - `LIT-0252` fulltext preprocess artifact: `artifacts/20260607T-b12-blocker-clear-lit0252-fulltext-preprocess-apply-b12-standard-pipeline-pilot-report.json`.
  - `LIT-0252` bundle export artifact: `artifacts/20260607T-b12-blocker-clear-lit0252-bundle-export-lit-0252-bundle-export.json`.
  - `LIT-0252` dossier dry-run/import artifacts:
    - `artifacts/20260607T-b12-blocker-clear-lit0252-dossier-dry-run.json`
    - `artifacts/20260607T-b12-blocker-clear-lit0252-dossier-import.json`
  - `LIT-0252` index apply artifact: `artifacts/20260607T-b12-blocker-clear-lit0252-index-retry-apply-b12-content-backfill-pilot-report.json`.
  - result: `LIT-0252` replaced the OCR-blocked scanned source with the public title-matched Penn State PDF, succeeded at `FULLTEXT_PREPROCESSED`, imported a 74-source-ref `codex_curated` dossier, and completed through `INDEXED`.
  - remaining source audit artifacts:
    - `artifacts/20260607T-b12-blocker-clear-remaining-source-audit-dry-run-b12-fulltext-acquisition-pilot-report.json`
    - `artifacts/20260607T-b12-blocker-clear-remaining-source-audit-apply-b12-fulltext-acquisition-pilot-report.json`
    - `artifacts/20260607T-b12-blocker-clear-remaining-source-audit.json`
  - result: no rights-safe automatically downloadable fulltext was found for `LIT-0163`, `LIT-0166`, or `LIT-0257`.
  - soft-exclusion artifact: `artifacts/20260607T-d23-source-blocker-soft-exclusion.json`.
  - soft-exclusion counting artifact: `artifacts/20260607T-after-d23-source-blocker-soft-exclusion.json`.
  - result: `LIT-0163`, `LIT-0166`, and `LIT-0257` were tagged `classification:excluded-from-corpus`, `classification:source-access-blocked`, and `b12:soft-excluded`; they no longer count in managed/effective resource-pool or blocker metrics.

## Processed Records
- `LIT-0153`: BudgetThinker: Empowering Budget-aware LLM Reasoning with Control Tokens.
- `LIT-0154`: Token-Budget-Aware LLM Reasoning.
- `LIT-0155`: Inference Scaling Laws: An Empirical Analysis of Compute-Optimal Inference for Problem-Solving with Language Models.
- `LIT-0156`: Cloud Native System for LLM Inference Serving.
- `LIT-0157`: Efficient LLM Serving Under Variable Cloud Traffic Loads.
- `LIT-0158`: ElasticMM: Efficient Multimodal LLMs Serving with Elastic Multimodal Parallelism.
- `LIT-0159`: HexAGenT: Efficient Agentic LLM Serving via Workflow- and Heterogeneity-Aware Scheduling.
- `LIT-0160`: Infinite-LLM: Efficient LLM Service for Long Context with DistAttention and Distributed KVCache.
- `LIT-0161`: KVDirect: Distributed Disaggregated LLM Inference.
- `LIT-0162`: NetKV: Network-Aware Decode Instance Selection for Disaggregated LLM Inference.
- `LIT-0163`: NeuStream: Bridging Deep Learning Serving and Stream Processing.
- `LIT-0164`: Observation, Not Prediction: Conversation-Level Disaggregated Scheduling for Agentic Serving.
- `LIT-0165`: RTP-LLM: High-Performance Alibaba LLM Inference Engine.
- `LIT-0166`: WindServe: Efficient Phase-Disaggregated LLM Serving with Stream-based Dynamic Scheduling.
- `LIT-0252`: When Is "Nearest Neighbor" Meaningful?
- `LIT-0167`: Adaptive Retrieval-Augmented Generation for Conversational Systems.
- `LIT-0168`: CDF-RAG: Causal Dynamic Feedback for Adaptive Retrieval-Augmented Generation.
- `LIT-0169`: CtrlA: Adaptive Retrieval-Augmented Generation via Inherent Control.
- `LIT-0170`: Embedding-Informed Adaptive Retrieval-Augmented Generation of Large Language Models.
- `LIT-0171`: MBA-RAG: a Bandit Approach for Adaptive Retrieval-Augmented Generation through Question Complexity.
- `LIT-0172`: Vendi-RAG: Adaptively Trading-Off Diversity And Quality Significantly Improves Retrieval Augmented Generation With LLMs.

## Current B12 Record State
- `LIT-0153`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version was refreshed during blocker cleanup.
- `LIT-0154`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version was refreshed during blocker cleanup.
- `LIT-0155`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 153 chunks/vectors.
- `LIT-0156`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 99 chunks/vectors.
- `LIT-0157`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 161 chunks/vectors.
- `LIT-0158`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version was refreshed during blocker cleanup.
- `LIT-0159`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 191 chunks/vectors.
- `LIT-0160`: all stages through `INDEXED` succeeded; active embedding version has 1037 chunks/vectors.
- `LIT-0161`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 146 chunks/vectors.
- `LIT-0162`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 144 chunks/vectors.
- `LIT-0163`: citation and abstract succeeded; fulltext acquisition failed with `UNPAYWALL_NO_OA_PDF`; soft-excluded from the managed/effective resource pool.
- `LIT-0164`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 154 chunks/vectors.
- `LIT-0165`: all stages through `INDEXED` succeeded via `codex_curated`; active embedding version has 194 chunks/vectors.
- `LIT-0166`: citation and abstract succeeded; fulltext acquisition failed with a 403 download from the OA PDF path; soft-excluded from the managed/effective resource pool.
- `LIT-0252`: all stages through `INDEXED` succeeded via a public title-matched PDF replacement plus `codex_curated`; original scanned PDF path remains a historical failed asset.
- `LIT-0257`: citation and abstract succeeded; no explicit URL, arXiv id, or DOI OA resolver is available; soft-excluded from the managed/effective resource pool.
- `LIT-0167`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 82 chunks/vectors.
- `LIT-0168`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 236 chunks/vectors.
- `LIT-0169`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 178 chunks/vectors.
- `LIT-0170`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 69 chunks/vectors.
- `LIT-0171`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 75 chunks/vectors.
- `LIT-0172`: all stages through `INDEXED` succeeded via arXiv acquisition plus `codex_curated`; active embedding version has 112 chunks/vectors.

## Latest Counting
- Artifact: `artifacts/20260607T-after-b12-codex-curated-arxiv-ready-tranche-index.json`
- Metrics:
  - candidate pool records: 62.
  - candidate ready-for-promotion records: 20.
  - candidate promoted records: 20.
  - managed corpus records: 163.
  - effective literature records: 163.
  - pipeline incomplete records: 0.
  - pipeline blocked records: 0.
  - pipeline not-started records: 0.

## Next Gate
- The 10 initial B11-promoted records have completed all standard stages through `INDEXED`.
- `LIT-0252` has moved past OCR/fulltext source blocker and now counts as effective literature.
- Default content backfill now expects curated key-content dossiers and should not call the provider gateway.
- The pilot runner timeout cleanup is verified, so future small retries should not leave dangling local `RUNNING` pipeline runs.
- Non-blocker retry evidence now shows the key-content timeout also affects `LIT-0154`.
- Future `llm_gateway` retries must be explicit and size `provider_call_budget` to section-level fan-out, not paper count.
- Prefer bounded diagnostic `llm_gateway` retries with `B12_BACKFILL_EXTRACTION_MAX_RETRIES=0`; avoid content-run timeouts that are lower than the single-section provider retry window.
- Keep `LIT-0163`, `LIT-0166`, and `LIT-0257` soft-excluded unless authenticated/user-provided fulltext is available.
- The opportunity tranche added 2 effective records and 2 soft-excluded source-access records; future opportunity tranches should prefer arXiv or verified direct-PDF candidates when the goal is high B12 completion throughput.
- The arXiv-ready RAG tranche added 6 effective records; future B11 promotion batches should prefer candidates with explicit arXiv or verified direct-PDF sources when the goal is fast effective-literature growth.
- At the D25 checkpoint, every currently managed corpus record is effective; the remaining 20 ready candidates should be promoted in small source-available tranches.
