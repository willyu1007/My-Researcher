# 04 Verification

## Verification Log

### 2026-06-04 - Initial Preflight
- Status: completed.
- Checks:
  - Literature DB count:
    - Total `LiteratureRecord`: 325.
    - Tagged corpus target set: 125.
  - Settings:
    - Content-processing storage root is configured under `/Volumes/DataDisk/Data/PaperEngineer/literature-content-processing`.
    - OpenAI and DashScope provider keys are set in redacted settings.
    - GROBID endpoint: `http://localhost:8070`.
    - GROBID health: unavailable, `fetch failed`.
  - Docker:
    - Docker daemon was not reachable via `/Users/yurui/.docker/run/docker.sock`.

### 2026-06-04 - Acquisition And Abstract Pipeline
- Status: completed up to fulltext parser boundary.
- Acquisition canary:
  - Artifact: `artifacts/20260604T-acquisition-canary-acquisition-apply.json`.
  - Result: 3/3 succeeded, 0 failed.
- Batch arXiv acquisition:
  - Artifact: `artifacts/20260604T-acquisition-all-arxiv-acquisition-apply.json`.
  - Result: 106/106 succeeded, 0 failed.
  - DB result after canary plus batch: 109/109 arXiv target records have raw fulltext assets.
- Initial full target `ABSTRACT_READY` backfill:
  - Artifact: `artifacts/20260604T-abstract-all-tagged-backfill-apply.json`.
  - Result: 113 succeeded, 9 blocked by `ABSTRACT_SOURCE_MISSING`.
- Classic theory metadata enrichment:
  - Artifact: `artifacts/20260604T-classic-theory-abstract-enrichment-metadata-import-apply.json`.
  - Result: 4 existing records enriched through OpenAlex-backed web source rows.
  - Artifact: `artifacts/20260604T-classic-theory-openalex-broad-enrichment-metadata-import-apply.json`.
  - Result: 2 existing records enriched through broader OpenAlex title matching.
  - Artifact: `artifacts/20260604T-classic-theory-web-source-enrichment-metadata-import-apply.json`.
  - Result: 3 existing records enriched through web-source evidence.
- Final `ABSTRACT_READY` completion:
  - Artifact: `artifacts/20260604T-abstract-after-web-enrichment-backfill-apply.json`.
  - Result: 3/3 succeeded, 0 blocked.
  - DB result: 125/125 target records have `citationComplete=true` and `abstractReady=true`.
- Dedup status repair:
  - Artifact: `artifacts/20260604T-dedup-status-repair-apply.json`.
  - Result: the 9 metadata-enriched existing records are restored to `dedupStatus=unique`.
  - Artifact: `artifacts/20260604T-b1-dedup-status-repair-apply.json`.
  - Result: 14 pre-existing B1 target records with the same metadata-refresh side effect are restored to `dedupStatus=unique`.

### 2026-06-04 - Remaining Blockers
- Fulltext acquisition dry-run after metadata enrichment:
  - Artifact: `artifacts/20260604T-acquisition-after-metadata-enrichment-dry-acquisition-dry-run.json`.
  - Result: 109 existing assets skipped, 16 target records blocked.
  - 13 records: `UNPAYWALL_NOT_CONFIGURED`.
  - 3 records: `FULLTEXT_SOURCE_MISSING`.
- Fulltext preprocessing canary:
  - Artifact: `artifacts/20260604T-fulltext-preprocess-grobid-blocker-backfill-apply.json`.
  - Result: `LIT-0306` blocked by `FULLTEXT_PARSER_UNAVAILABLE`.
  - GROBID endpoint: `http://localhost:8070`.

### 2026-06-04 - GROBID Startup And Fulltext Canary
- Status: completed.
- GROBID startup:
  - `docker start pea-grobid-e2e`
  - Result: container running with `0.0.0.0:8070->8070/tcp`.
  - `curl http://localhost:8070/api/isalive`
  - Result: `true`.
- Backend health:
  - Artifact: `artifacts/20260604T-settings-after-grobid-start-settings-dry-run.json`.
  - Result: `fulltext_parser_health.status=ready`, 12 models loaded, 0 failed.
- Unpaywall configuration check:
  - `.env.local`: `UNPAYWALL_EMAIL` not found.
  - `env/.env.example`: `UNPAYWALL_EMAIL` not found.
  - DB application setting `literature_acquisition/settings`: row absent.
- Fulltext preprocessing canary dry-run:
  - Artifact: `artifacts/20260604T-fulltext-preprocess-after-grobid-dry-backfill-dry-run.json`.
  - Result: 3 planned, 0 blocked, 0 extraction calls, 0 embedding calls.
- Fulltext preprocessing canary apply:
  - Artifact: `artifacts/20260604T-fulltext-preprocess-after-grobid-backfill-apply.json`.
  - Result: 3/3 succeeded, 0 blocked.
  - Deltas: 3 pipeline runs, 3 pipeline artifacts, 3 fulltext documents.

### 2026-06-04 - Unpaywall Email Dry-Run
- Status: completed.
- `.env.local` update:
  - `UNPAYWALL_EMAIL` is present and non-empty.
  - `node --env-file=.env.local` reads it successfully.
  - Email format validation passed.
- Acquisition dry-run:
  - Artifact: `artifacts/20260604T-acquisition-after-unpaywall-email-dry-acquisition-dry-run.json`.
  - Result: 13 planned, 3 blocked.
  - Source counts: `unpaywall=13`.
  - Estimated provider calls: 13 Unpaywall calls and 13 download calls.
  - Remaining blockers: `LIT-0207`, `LIT-0255`, and `LIT-0257` are still `FULLTEXT_SOURCE_MISSING`.

### 2026-06-04 - Fulltext Batch And Curated Key-Content Scaleout
- Status: completed.
- Unpaywall acquisition apply:
  - Artifact: `artifacts/20260604T-acquisition-after-unpaywall-email-acquisition-apply.json`.
  - Result: 3 succeeded, 10 failed, 3 blocked.
- Fulltext preprocessing batch:
  - Dry-run artifact: `artifacts/20260604T-fulltext-preprocess-all-assets-dry-backfill-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-fulltext-preprocess-all-assets-backfill-apply.json`.
  - Result: 109 succeeded, 13 blocked by missing raw assets.
  - DB result: 112/125 target records had fulltext documents.
- Canceled `llm_gateway` indexed canary recovery:
  - Original artifact: `artifacts/20260604T-indexed-canary-backfill-apply.json`.
  - Recovery artifact: `artifacts/20260604T-indexed-canary-cancel-recovery.json`.
  - Result: 2 in-flight runs repaired; 0 remaining `RUNNING` runs.
- Lightweight curated key-content canary:
  - Dry-run artifact: `artifacts/20260604T-key-content-curated-canary-dry-key-content-curated-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-key-content-curated-canary-key-content-curated-apply.json`.
  - Result: 3/3 imported, `key_content_ready` moved from 0 to 3.
- Indexed canary after curated key-content:
  - Dry-run artifact: `artifacts/20260604T-indexed-after-curated-canary-dry-backfill-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-indexed-after-curated-canary-backfill-apply.json`.
  - Result: 3/3 succeeded.
  - Deltas: 3 embedding versions, 461 embedding chunks, 4,767 token indexes.
- Fulltext-ready batch key-content:
  - Dry-run artifact: `artifacts/20260604T-key-content-curated-all-fulltext-dry-key-content-curated-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-key-content-curated-all-fulltext-key-content-curated-apply.json`.
  - Result: 109/109 imported, `key_content_ready` moved from 3 to 112.
- Fulltext-ready batch indexing:
  - Dry-run artifact: `artifacts/20260604T-indexed-fulltext-ready-after-curated-dry-backfill-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-indexed-fulltext-ready-after-curated-backfill-apply.json`.
  - Result: 109/109 succeeded.
  - Deltas: 109 embedding versions, 18,489 embedding chunks, 167,959 token indexes.

### 2026-06-04 - Public PDF Recovery And Final Status
- Status: completed with two documented manual blockers.
- Public PDF recovery:
  - Artifact: `artifacts/20260604T-missing-asset-public-pdf-downloads.json`.
  - Result: 12/13 public PDF candidates acquired through the backend download route.
  - Remaining missing asset: `LIT-0257`.
- Recovered-asset fulltext preprocessing:
  - Dry-run artifact: `artifacts/20260604T-missing-assets-fulltext-preprocess-dry-backfill-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-missing-assets-fulltext-preprocess-backfill-apply.json`.
  - Result: 11 succeeded, 1 blocked.
  - Blocked item: `LIT-0252`, `FULLTEXT_OCR_REQUIRED`.
- Recovered-asset key-content:
  - Dry-run artifact: `artifacts/20260604T-missing-assets-key-content-curated-dry-key-content-curated-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-missing-assets-key-content-curated-key-content-curated-apply.json`.
  - Result: 11/11 imported.
- Recovered-asset indexing:
  - Dry-run artifact: `artifacts/20260604T-missing-assets-indexed-dry-backfill-dry-run.json`.
  - Apply artifact: `artifacts/20260604T-missing-assets-indexed-backfill-apply.json`.
  - Result: 11/11 succeeded.
  - Deltas: 11 embedding versions, 1,774 embedding chunks, 13,344 token indexes.
- Final status:
  - Artifact: `artifacts/20260604T-final-pipeline-status.json`.
  - DB result: 125/125 citation normalized, 125/125 abstract ready.
  - DB result: 124/125 raw assets, 123/125 fulltext preprocessed.
  - DB result: 123/125 key-content ready, chunked, embedded, indexed, and with embedding chunks.
  - Non-terminal runs: 0.

### 2026-06-04 - Counting Convention
- Status: completed.
- Script:
  - `tools/literature-counting-report.mjs`
- Artifact:
  - `artifacts/20260604T-counting-conventions.json`
- Result:
  - `db_total_records`: 326.
  - `adaptive_corpus_records`: 125.
  - `pipeline_complete_records`: 123.
  - `pipeline_blocked_records`: 2.
  - `non_corpus_records`: 201.
- Non-corpus bucket:
  - 95 topic-selection API evidence records.
  - 94 topic-selection harness evidence records.
  - 12 other untagged records.
- Interpretation:
  - The 203 all-record not-indexed count is not 203 papers waiting for pipeline work.
  - It is 201 excluded non-corpus rows plus 2 adaptive corpus blockers.
  - Future collection progress MUST use `adaptive_corpus_records`, not raw `LiteratureRecord` table size.

### 2026-06-04 - New Collection Round Planning
- Status: completed as planning documentation.
- Updated files:
  - `00-overview.md`
  - `01-plan.md`
  - `03-implementation-notes.md`
  - `04-verification.md`
- Result:
  - The return-to-collection baseline is documented as 125 adaptive corpus records, 123 indexed, 2 manual blockers, and 201 excluded non-corpus rows.
  - Phase 7 defines the next collection round around the three agreed directions and four collection roles.
  - The plan requires query-ledger, candidate manifest, import report, pipeline status, and refreshed counting artifacts before any scaleout claim.

### 2026-06-04 - Documentation And Governance Checks
- Status: completed.
- Counting report refresh:
  - Command: `TS_NODE_TRANSPILE_ONLY=true PIPELINE_CAMPAIGN_RUN_ID=20260604T-counting-conventions node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/literature-counting-report.mjs`
  - Result: refreshed `artifacts/20260604T-counting-conventions.json`.
- Syntax checks:
  - Command: `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/literature-counting-report.mjs`
  - Result: passed.
  - Command: `node --check dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/key-content-curated-dossier-runner.mjs`
  - Result: passed.
- Documentation checks:
  - Command: `git diff --check -- dev-docs/active/adaptive-llm-systems-literature-pipeline-completion`
  - Result: passed.
  - Command: `LC_ALL=C rg -n "[^\\x00-\\x7F]" dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/00-overview.md dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/01-plan.md dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/03-implementation-notes.md dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/04-verification.md dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/06-counting-conventions.md`
  - Result: no non-ASCII matches.
- Governance:
  - Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: passed.
  - Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: passed.

### 2026-06-04 - B9 New Collection Round Import
- Status: completed.
- Script:
  - `tools/b9-new-collection-round.mjs`
- Dry-run:
  - Command: `TS_NODE_TRANSPILE_ONLY=true node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/b9-new-collection-round.mjs`
  - Result: selected 22 high-confidence candidates after filtering.
- Apply:
  - Command: `TS_NODE_TRANSPILE_ONLY=true node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/b9-new-collection-round.mjs --apply`
  - Result: 22 new `LiteratureRecord` rows and 22 new `LiteratureSource` rows.
  - Result: no content-processing, asset, embedding, or acquisition side effects from import.
- Artifacts:
  - `artifacts/b9-query-ledger.json`
  - `artifacts/b9-candidates-manifest.json`
  - `artifacts/b9-import-report.json`
  - `07-b9-new-collection-round.md`
- Direction/role coverage:
  - 7 RAG-aware allocation core records.
  - 1 RAG-aware theory bridge record.
  - 6 LLM serving system-support records.
  - 7 test-time compute strategy records.
  - 1 test-time compute theory bridge record.

### 2026-06-04 - B9 Withdrawn Exclusion
- Status: completed.
- Item:
  - `LIT-0337`, `2604.21231`, SparKV.
- Evidence:
  - arXiv page reports the paper as withdrawn.
  - `https://arxiv.org/pdf/2604.21231` returns 404.
- Action:
  - Removed `collection:system-support`, `direction:llm-serving-resource-allocation`, and `batch:b9-new-collection-round`.
  - Added `classification:withdrawn`, `classification:excluded-from-corpus`, `exclusion:withdrawn-arxiv-no-pdf`, and `import-batch:b9-new-collection-round`.
- Artifact:
  - `artifacts/b9-withdrawn-exclusion-report.json`
- Result:
  - B9 valid adaptive corpus records: 21.
  - Excluded imported record remains in DB but is not counted as corpus progress.

### 2026-06-04 - B9 Standard Pipeline Completion
- Status: completed for valid B9 corpus records.
- `ABSTRACT_READY`:
  - Dry-run artifact: `artifacts/20260604T-b9-abstract-ready-dry-backfill-dry-run.json`
  - Apply artifact: `artifacts/20260604T-b9-abstract-ready-backfill-apply.json`
  - Result: 22/22 imported records reached citation normalization and abstract readiness before the withdrawn exclusion.
- Fulltext acquisition:
  - Dry-run artifact: `artifacts/20260604T-b9-acquisition-dry-acquisition-dry-run.json`
  - Apply artifact: `artifacts/20260604T-b9-acquisition-acquisition-apply.json`
  - Result: 21 raw assets acquired; `LIT-0337` failed because the withdrawn arXiv PDF returned 404.
- GROBID settings:
  - Artifact: `artifacts/20260604T-b9-settings-settings-dry-run.json`
  - Result: GROBID `status=ready`, 12 loaded models, 0 failed models.
- Fulltext preprocessing:
  - Dry-run artifact: `artifacts/20260604T-b9-fulltext-preprocess-dry-backfill-dry-run.json`
  - Apply artifact: `artifacts/20260604T-b9-fulltext-preprocess-backfill-apply.json`
  - Result: 21/21 valid B9 corpus records reached `FULLTEXT_PREPROCESSED`.
- Curated key-content:
  - Dry-run artifact: `artifacts/20260604T-b9-key-content-curated-dry-key-content-curated-dry-run.json`
  - Apply artifact: `artifacts/20260604T-b9-key-content-curated-key-content-curated-apply.json`
  - Result: 21/21 valid B9 corpus records reached lightweight `codex_curated` `KEY_CONTENT_READY`.
- Indexing:
  - Dry-run artifact: `artifacts/20260604T-b9-indexed-dry-backfill-dry-run.json`
  - Apply artifact: `artifacts/20260604T-b9-indexed-backfill-apply.json`
  - Result: 21/21 valid B9 corpus records reached `INDEXED`.
  - Deltas: 21 embedding versions, 4,036 embedding chunks, 33,326 token indexes.
- B9 status artifact:
  - `artifacts/b9-pipeline-status.json`
  - Result: 21 valid B9 corpus records have `CITATION_NORMALIZED`, `ABSTRACT_READY`, `FULLTEXT_PREPROCESSED`, `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED`.

### 2026-06-04 - Counting After B9
- Status: completed.
- Import-counting artifact:
  - `artifacts/20260604T-after-b9-import-counting.json`
  - Result before withdrawn exclusion and pipeline: 147 adaptive corpus records, 123 indexed, 24 not indexed.
- Final-counting artifact:
  - `artifacts/20260604T-after-b9-pipeline-counting.json`
- Final result:
  - `db_total_records`: 349.
  - `adaptive_corpus_records`: 146.
  - `pipeline_complete_records`: 144.
  - `pipeline_blocked_records`: 2.
  - `non_corpus_records`: 203.
- Interpretation:
  - B9 increased the valid adaptive corpus by 21 and completed those 21 through the standard pipeline.
  - The only remaining adaptive corpus blockers are still `LIT-0252` (`FULLTEXT_OCR_REQUIRED`) and `LIT-0257` (`FULLTEXT_SOURCE_MISSING`).

### 2026-06-04 - Final B9 Verification
- Status: completed.
- B9 pipeline artifact:
  - Command: `jq '.stage_coverage' dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/b9-pipeline-status.json`
  - Result: 21/21 valid B9 corpus records succeeded at `CITATION_NORMALIZED`, `ABSTRACT_READY`, `FULLTEXT_PREPROCESSED`, `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED`.
- Final counting artifact:
  - Command: `jq '.metrics' dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260604T-after-b9-pipeline-counting.json`
  - Result: 349 DB records, 146 adaptive corpus records, 144 indexed corpus records, 2 corpus blockers, and 203 non-corpus records.
- Local checks:
  - Command: `node --check` on `tools/b9-new-collection-round.mjs`, `tools/literature-counting-report.mjs`, `tools/key-content-curated-dossier-runner.mjs`, and `tools/pipeline-campaign-runner.mjs`.
  - Result: passed.
  - Command: `git diff --check -- dev-docs/active/adaptive-llm-systems-literature-pipeline-completion .ai/project/main`
  - Result: passed.
  - Command: `LC_ALL=C rg -n "[^\\x00-\\x7F]"` on the updated T-120 Markdown docs.
  - Result: no non-ASCII matches.
- Governance:
  - Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: passed.
  - Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: passed.

### 2026-06-04 - LIT-0252 Visual Extraction
- Status: completed as summary-level extraction.
- Source:
  - Local PDF: `/Volumes/DataDisk/Data/PaperEngineer/literature-content-processing/raw/LIT-0252/1780552467211-622ff57f-5502-4151-9ea5-18fbbb11450d-LIT-0252.pdf`.
  - Rendered pages: `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/lit-0252-ocr-pages`.
- Artifact:
  - `08-lit-0252-visual-extraction.md`
  - `artifacts/lit-0252-visual-extraction.json`
- Result:
  - The scanned PDF was opened and inspected visually.
  - A non-verbatim theory-support extraction was produced for RAG-aware allocation, adaptive retrieval-compute allocation, LLM serving allocation, and test-time compute budgeting.
  - `FULLTEXT_PREPROCESSED` remains blocked because this is not a full OCR text layer.

### 2026-06-04 - LIT-0252 Partial Visual Index
- Status: completed as a partial retrieval surface.
- Script:
  - `tools/lit-0252-visual-index.mjs`
- Dry-run:
  - Command: `TS_NODE_TRANSPILE_ONLY=true PIPELINE_CAMPAIGN_RUN_ID=20260604T-lit-0252-visual-index node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/lit-0252-visual-index.mjs`
  - Artifact: `artifacts/20260604T-lit-0252-visual-index-dry-run.json`
  - Result: planned 13 chunks and 254 local tokens with no `FULLTEXT_PREPROCESSED` or standard `INDEXED` changes.
- Apply:
  - Command: `TS_NODE_TRANSPILE_ONLY=true PIPELINE_CAMPAIGN_RUN_ID=20260604T-lit-0252-visual-index node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/tools/lit-0252-visual-index.mjs --apply`
  - Artifact: `artifacts/20260604T-lit-0252-visual-index-apply.json`
  - Result: active embedding version `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
  - Result: 13 chunks, 3072-dimensional embeddings, 254 local token-index rows.
  - Result: OpenAI embedding telemetry used 1 request and 553 embedding input tokens.
- DB boundary checks:
  - `LIT-0252.activeEmbeddingVersionId`: `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
  - Active embedding version status: `PARTIAL_INDEXED`.
  - `LiteraturePipelineState.keyContentReady`: `true`.
  - `FULLTEXT_PREPROCESSED`: still `BLOCKED` with `FULLTEXT_OCR_REQUIRED`.
  - Standard `INDEXED`: still `NOT_STARTED`.
  - Standard `KEY_CONTENT_READY`: `SUCCEEDED` with `readiness_status=PARTIAL_READY` and `standard_fulltext_preprocessed=false`.
  - `VISUAL_INDEXED`: `SUCCEEDED`.
- Scoped retrieval verification:
  - Artifact: `artifacts/20260604T-lit-0252-visual-retrieval-check.json`
  - Method: created a temporary topic scope containing only `LIT-0252`, called standard `POST /literature/retrieve`, then deleted the scope.
  - Query: `nearest neighbor meaningful high dimensional distance contrast retrieval allocation rag`.
  - Result: HTTP 200.
  - Result: `LIT-0252` ranked 1/1.
  - Result: top hit used embedding version `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
  - Result: `profiles_used` was `openai / text-embedding-3-large / 3072`.
  - Result: temporary scope remaining count was 0.
- Counting refresh:
  - Artifact: `artifacts/20260604T-after-lit-0252-visual-index-counting.json`
  - Result: `adaptive_corpus_records=146`.
  - Result: `pipeline_complete_records=144`.
  - Result: `pipeline_blocked_records=2`.
  - Result: `with_embedding_chunks=145`.
  - Interpretation: LIT-0252 now has a partial visual retrieval surface, but the standard complete count remains 144 because OCR/fulltext preprocessing and standard indexing are still blocked or not started.
