# 03 Implementation Notes

## 2026-06-04 - Task Started
- Created T-120 as a new task because T-116/T-117/T-119 intentionally avoided expensive content-processing and fulltext side effects.
- Scope is the tagged adaptive LLM systems corpus, not raw DB literature rows.
- Initial blocker: GROBID health reports unavailable at `http://localhost:8070`; Docker daemon is not reachable from this shell.

## 2026-06-04 - Pipeline Campaign Execution
- Added a local campaign runner at `tools/pipeline-campaign-runner.mjs` to drive existing backend content-processing and acquisition routes with explicit target selection, dry-run/apply mode, and artifact reports.
- Confirmed acquisition canary for `LIT-0306`, `LIT-0307`, and `LIT-0308`.
- Scaled arXiv acquisition to all arXiv-backed target records:
  - 106 additional PDFs acquired after the 3-record canary.
  - 109/109 arXiv target records now have raw fulltext assets.
- Ran `ABSTRACT_READY` canary successfully for `LIT-0306`, `LIT-0307`, and `LIT-0308`.
- Ran full target-set `ABSTRACT_READY` backfill:
  - First batch completed 113 records and exposed 9 `ABSTRACT_SOURCE_MISSING` blockers.
  - The 9 blockers were classic-theory/manual records from the earlier seed-bank batch.
- Enriched classic-theory abstracts without creating new literature rows:
  - 6 records from OpenAlex-backed metadata/source rows.
  - 3 records from web-source evidence (`CoLab`, DTU Orbit, and Wisconsin technical report PDF).
  - Re-ran `ABSTRACT_READY` until all 125 target records were abstract ready.
- Repaired the metadata-enrichment side effect where collection import marked enriched existing records as `dedupStatus: duplicate`; the 9 enriched records are restored to `unique`.
- Repaired the same pre-existing B1 metadata-refresh side effect for `LIT-0177` through `LIT-0190`; these 14 target records are also restored to `unique`.
- Confirmed current corpus counters:
  - `corpus`: 125.
  - `withRecordAbstractText`: 125.
  - `citationComplete`: 125.
  - `abstractReady`: 125.
  - `nonUniqueDedupIds`: 0.
  - `withAssets`: 109.
  - `withFulltextDocs`: 0.
  - `withEmbeddingChunks`: 0.
- Rechecked fulltext acquisition for all target records:
  - 109 records skipped because raw assets already exist.
  - 13 DOI-backed records are blocked by `UNPAYWALL_NOT_CONFIGURED`.
  - 3 records are blocked by `FULLTEXT_SOURCE_MISSING`.
- Confirmed fulltext preprocessing canary remains blocked by `FULLTEXT_PARSER_UNAVAILABLE` while GROBID is unavailable.

## 2026-06-04 - GROBID Started
- Started Docker Desktop and reused the existing `pea-grobid-e2e` container.
- Container image: `grobid/grobid:0.9.0-crf`.
- Port binding: `0.0.0.0:8070->8070/tcp`.
- GROBID `/api/isalive` returned `true`.
- Backend settings health reported `fulltext_parser_health.status=ready` with 12 loaded models and 0 failed models.
- Checked Unpaywall configuration:
  - `.env.local`: no `UNPAYWALL_EMAIL` entry.
  - `env/.env.example`: no `UNPAYWALL_EMAIL` entry.
  - `literature_acquisition/settings` application setting row: absent, so no persisted Unpaywall email.
- Ran `FULLTEXT_PREPROCESSED` canary for `LIT-0306`, `LIT-0307`, and `LIT-0308`:
  - 3/3 succeeded.
  - Created 3 fulltext documents and 3 pipeline artifacts.
  - Parser diagnostics for all 3 records reported `GROBID_TEI_PARSED` with `parser_quality_bucket=high`.

## 2026-06-04 - Unpaywall Email Configured
- Added `UNPAYWALL_EMAIL` to `.env.local`.
- Verified `node --env-file=.env.local` can read the value and that the value matches the email format expected by `LiteratureAcquisitionSettingsService`.
- Ran acquisition dry-run after the environment change:
  - 13 records planned through `unpaywall`.
  - 13 estimated Unpaywall calls and 13 estimated download calls.
  - 3 records remain blocked by `FULLTEXT_SOURCE_MISSING`.

## 2026-06-04 - Fulltext And Indexed Scaleout
- Ran Unpaywall-backed acquisition after configuring the email:
  - 3 additional raw assets acquired.
  - 10 records failed via `UNPAYWALL_NO_OA_PDF` or 403 download responses.
  - 3 records remained `FULLTEXT_SOURCE_MISSING`.
- Ran `FULLTEXT_PREPROCESSED` batch scaleout for asset-backed records:
  - 109 additional records succeeded after the GROBID canary.
  - 112/125 target records reached `FULLTEXT_PREPROCESSED`.
- Initial `INDEXED` canary using `llm_gateway` key-content extraction was canceled:
  - The stage expanded to section-level LLM extraction and took too long for canary scaleout.
  - The canceled run left two `RUNNING` pipeline runs; they were recovered with `BACKFILL_RUN_INTERRUPTED` and the batch items were marked `CANCELED`.
  - Recovery artifact: `artifacts/20260604T-indexed-canary-cancel-recovery.json`.
- Added `tools/key-content-curated-dossier-runner.mjs`:
  - Exports the backend key-content curation bundle.
  - Builds a lightweight source-anchored `codex_curated` dossier.
  - Validates through `/key-content-dossier/dry-run` before import.
  - Marks the dossier `PARTIAL_READY` and records warnings that it is not a deep paper-claim dossier.
- Imported lightweight `codex_curated` dossiers for 112 fulltext-ready records.
- Ran `INDEXED` canary after curated key-content:
  - `LIT-0306`, `LIT-0307`, and `LIT-0308` succeeded.
  - Deltas: 3 embedding versions, 461 embedding chunks, 4,767 token indexes.
- Ran batch `INDEXED` scaleout for the remaining 109 fulltext-ready records:
  - 109/109 succeeded.
  - Deltas: 109 embedding versions, 18,489 embedding chunks, 167,959 token indexes.

## 2026-06-04 - Public PDF Recovery
- Used the backend `/content-assets/download` route for public PDF candidates instead of directly registering files.
- Public PDF recovery result:
  - 12/13 missing-asset records acquired raw assets.
  - `LIT-0257` remained missing because it is a book record without a public fulltext source in the current source set.
- Ran `FULLTEXT_PREPROCESSED` on the 12 recovered assets:
  - 11/12 succeeded.
  - `LIT-0252` blocked with `FULLTEXT_OCR_REQUIRED`; the public Wisconsin technical report PDF is scanned or has no extractable text for GROBID.
- Imported lightweight `codex_curated` dossiers for the 11 newly preprocessed records.
- Ran `INDEXED` for those 11 records:
  - 11/11 succeeded.
  - Deltas: 11 embedding versions, 1,774 embedding chunks, 13,344 token indexes.
- Final corpus status:
  - 125/125 citation normalized and abstract ready.
  - 124/125 have raw assets.
  - 123/125 have `FULLTEXT_PREPROCESSED`.
  - 123/125 have `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED`.
  - 0 non-terminal content-processing runs remain.

## 2026-06-04 - Counting Convention And Collection Restart Plan
- Added `tools/literature-counting-report.mjs` to make the collection denominator reproducible.
- Added `06-counting-conventions.md` as the counting authority for this task:
  - `db_total_records`: 349.
  - `adaptive_corpus_records`: 146.
  - `pipeline_complete_records`: 144.
  - `pipeline_blocked_records`: 2.
  - `non_corpus_records`: 203.
- Updated the task overview so future status reports distinguish raw database hygiene from adaptive corpus progress.
- Drafted the next collection round around the three agreed directions:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- The next collection mainline should import only records with stable corpus tags and should refresh the counting report after each batch.

## 2026-06-04 - B9 New Collection Round
- Added `tools/b9-new-collection-round.mjs` for controlled collection around the three agreed directions.
- Ran arXiv exact-seed discovery plus OpenAlex works-search discovery:
  - 42 query groups.
  - 153 discovered candidates after filtering.
  - 24 existing DB matches skipped.
  - 22 records imported through `/literature/collections/import`.
- Track coverage:
  - 7 RAG-aware allocation core records.
  - 1 RAG-aware theory bridge record.
  - 6 LLM serving system-support records.
  - 7 test-time compute strategy records.
  - 1 test-time compute theory bridge record.
- `LIT-0337` was excluded from the adaptive corpus after import:
  - arXiv marks `2604.21231` as withdrawn.
  - The PDF URL returns 404.
  - Removed `collection:*`, `direction:*`, and `batch:*` tags.
  - Added `classification:withdrawn`, `classification:excluded-from-corpus`, and `exclusion:withdrawn-arxiv-no-pdf`.
- Ran the standard literature pipeline for the 21 valid B9 corpus records:
  - `ABSTRACT_READY`: 21/21.
  - arXiv raw asset acquisition: 21/21 valid corpus records.
  - `FULLTEXT_PREPROCESSED`: 21/21.
  - lightweight `codex_curated` `KEY_CONTENT_READY`: 21/21.
  - `INDEXED`: 21/21.
- Final corpus status after B9:
  - 146 adaptive corpus records.
  - 144 indexed adaptive corpus records.
  - 2 remaining manual blockers from the previous corpus.

## 2026-06-04 - LIT-0252 Partial Visual Index
- Implemented option 2 for `LIT-0252`: keep the standard OCR/fulltext blocker intact, but create a retrieval-usable partial visual index from the manually curated visual extraction.
- Added `tools/lit-0252-visual-index.mjs`:
  - Reads `artifacts/lit-0252-visual-extraction.json`.
  - Builds a summary-level key-content dossier from visual extraction categories.
  - Creates 13 `visual_summary`, `evidence`, and `semantic_dossier` chunks.
  - Embeds those chunks through the active retrieval profile, currently `default / openai / text-embedding-3-large`.
  - Creates a local token index for lexical retrieval support.
- Apply result:
  - Active embedding version: `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
  - Embedding status: `PARTIAL_INDEXED`.
  - Embedding dimension: 3072.
  - Chunk count: 13.
  - Token index count: 254.
- Standard-stage boundary:
  - `FULLTEXT_PREPROCESSED` remains `BLOCKED` with `FULLTEXT_OCR_REQUIRED`.
  - Standard `INDEXED` remains `NOT_STARTED`.
  - Standard `KEY_CONTENT_READY` is present only as `readiness_status=PARTIAL_READY` with `source=manual_visual_curated`.
  - Nonstandard visual stages record the partial path: `VISUAL_KEY_CONTENT_READY`, `VISUAL_CHUNKED`, `VISUAL_EMBEDDED`, and `VISUAL_INDEXED`.
- Retrieval verification used a temporary topic scope containing only `LIT-0252`, called the standard `/literature/retrieve` route, and deleted the temporary scope afterward.
  - Result: route returned HTTP 200.
  - Result: `LIT-0252` ranked 1/1 for a nearest-neighbor distance-contrast query.
  - Result: temporary scope remaining count was 0.
- Capacity note:
  - Unscoped `/literature/retrieve` currently attempts to load all active chunks; with about 24.8k active chunks and 3072-dimensional vectors this can fail through Prisma before scoring.
  - This is a retrieval-scale issue independent of the LIT-0252 partial visual index and should be handled as a separate optimization task.
