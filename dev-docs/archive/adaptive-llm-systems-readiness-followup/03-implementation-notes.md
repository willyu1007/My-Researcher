# 03 Implementation Notes

## 2026-06-04 - Task Setup
- Created `T-117 adaptive-llm-systems-readiness-followup`.
- Decision: treat T-116 as closed and create a follow-up task for F1/F2.
- Decision: run F1 through the existing literature import boundary.
- Decision: run F2 as a readiness review only; do not create experiment-foundation assets in this task.

## 2026-06-04 - F1 Classic RAG Anchor Import
- Added `tools/f1-import-missing-core-classic.mjs`.
- Imported `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks` (`arxiv:2005.11401`) through `POST /literature/collections/import`.
- Created `LIT-0283` with source URL `https://arxiv.org/abs/2005.11401`.
- Applied T-116-compatible tags:
  - `collection:core`
  - `direction:rag-aware-allocation`
  - `subcluster:rag-evaluation-quality`
  - `metric:answer-quality`
  - `priority:p1`
  - `era:classic-pre-2023`
  - `classification:seed`
  - `classification:needs-judgment-card`
  - `batch:f1-import-missing-core-classic`
  - `query:f1-classic-rag-anchor`
- Wrote `artifacts/f1-classic-rag-import-report.json`.
- Verified content-processing, content asset, pipeline, and fulltext acquisition deltas remained 0.

## 2026-06-04 - F2 Fulltext/Code/Protocol Readiness
- Added `tools/f2-fulltext-code-readiness.mjs`.
- Built a 39-record target set:
  - 15 experiment-foundation candidates.
  - 24 current-round P0 research seeds.
  - 1 F1 classic RAG anchor.
- Wrote:
  - `artifacts/f2-readiness-targets-manifest.json`.
  - `artifacts/f2-fulltext-code-readiness-manifest.json`.
  - `artifacts/f2-fulltext-code-readiness-report.json`.
  - `06-f2-readiness-summary.md`.
- Detailed target/readiness JSON is generated under `.ai/.tmp/adaptive-llm-systems-readiness-followup/` and is not tracked.
- Verified 11 GitHub repository candidates through API or URL fallback.
- Marked 10 candidates as high runnable-feasibility promotion candidates.
- Left 16 records as `needs-manual-followup`.
- Verified no fulltext acquisition, content-processing, content asset, or pipeline jobs were created.

## 2026-06-04 - Corpus Artifact Boundary Cleanup
- Decision: the DB is the corpus SSOT; repo task bundles should not store large corpus/readiness snapshots.
- Replaced the F2 detailed target and readiness JSON files with lightweight manifests:
  - `artifacts/f2-readiness-targets-manifest.json`.
  - `artifacts/f2-fulltext-code-readiness-manifest.json`.
- The manifests preserve original repo-artifact checksums from the migration and point to ignored `.ai/.tmp` detailed local copies for replay/debugging.
- Updated `tools/f2-fulltext-code-readiness.mjs` so future runs keep detailed JSON outside repo and write only manifest/report/Markdown into the task bundle.
