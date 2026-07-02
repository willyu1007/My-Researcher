# 09 LIT-0252 Visual Index

## Purpose
- Provide a retrieval-usable partial index for `LIT-0252` while preserving the standard OCR/fulltext blocker.
- Use the visual extraction as a theory-support surface for RAG-aware allocation, adaptive retrieval-compute allocation, LLM serving allocation, and test-time compute budgeting.

## Input
- Visual extraction doc: `08-lit-0252-visual-extraction.md`.
- Visual extraction artifact: `artifacts/lit-0252-visual-extraction.json`.
- Source PDF: `/Volumes/DataDisk/Data/PaperEngineer/literature-content-processing/raw/LIT-0252/1780552467211-622ff57f-5502-4151-9ea5-18fbbb11450d-LIT-0252.pdf`.

## Output
- Script: `tools/lit-0252-visual-index.mjs`.
- Dry-run artifact: `artifacts/20260604T-lit-0252-visual-index-dry-run.json`.
- Apply artifact: `artifacts/20260604T-lit-0252-visual-index-apply.json`.
- Retrieval-check artifact: `artifacts/20260604T-lit-0252-visual-retrieval-check.json`.
- Active embedding version: `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
- Embedding status: `PARTIAL_INDEXED`.
- Chunk count: 13.
- Embedding dimension: 3072.
- Local token-index rows: 254.

## Stage Semantics
- Standard `FULLTEXT_PREPROCESSED` remains `BLOCKED` with `FULLTEXT_OCR_REQUIRED`.
- Standard `INDEXED` remains `NOT_STARTED`.
- Standard `KEY_CONTENT_READY` is recorded as `PARTIAL_READY`, sourced from `manual_visual_curated`.
- Visual path stages record the partial flow:
  - `VISUAL_KEY_CONTENT_READY`
  - `VISUAL_CHUNKED`
  - `VISUAL_EMBEDDED`
  - `VISUAL_INDEXED`

## Retrieval Check
- Verification used a temporary topic scope that contained only `LIT-0252`.
- The standard `POST /literature/retrieve` route returned HTTP 200.
- Query: `nearest neighbor meaningful high dimensional distance contrast retrieval allocation rag`.
- Result: `LIT-0252` ranked 1/1.
- Result: the hit used embedding version `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
- Cleanup: temporary topic scope remaining count was 0.

## Counting Impact
- Refreshed counting artifact: `artifacts/20260604T-after-lit-0252-visual-index-counting.json`.
- Adaptive corpus records: 146.
- Standard pipeline-complete records: 144.
- Pipeline blockers: 2.
- Records with embedding chunks: 145.
- Interpretation: the partial visual index improves retrieval availability for LIT-0252 but does not change the standard complete count.

## Open Risk
- Unscoped retrieval currently attempts to load all active embedding chunks and can fail at the Prisma read boundary once the active corpus has tens of thousands of 3072-dimensional vectors.
- Treat this as a retrieval-candidate preselection or pagination optimization issue, separate from LIT-0252 visual indexing.
