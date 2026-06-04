# 08 LIT-0252 Visual Extraction

## Decision
- State: summary-level extracted.
- Literature ID: `LIT-0252`.
- Title: `When Is "Nearest Neighbor" Meaningful?`
- Source PDF: `/Volumes/DataDisk/Data/PaperEngineer/literature-content-processing/raw/LIT-0252/1780552467211-622ff57f-5502-4151-9ea5-18fbbb11450d-LIT-0252.pdf`.
- Extraction artifact: `artifacts/lit-0252-visual-extraction.json`.

## Boundary
- This is a visual, non-verbatim content extraction from the scanned PDF.
- It is not a full OCR text layer.
- It must not be used to mark `FULLTEXT_PREPROCESSED` as succeeded.
- It can be used as a manual theory-support dossier for topic selection, RAG theory mapping, and retrieval-policy design.

## Extracted Thesis
The paper argues that nearest-neighbor search can become semantically weak in high-dimensional spaces because the closest and farthest distances can become nearly indistinguishable. The important question is therefore not only whether a nearest neighbor can be found efficiently, but whether the returned neighbor is meaningfully separated from alternative candidates.

## Core Theory Signals
- Distance contrast: compare nearest distance `DMIN` with farthest distance `DMAX`; if their ratio approaches 1, nearest-neighbor significance collapses.
- Normalized variance: when the variance of distance distribution is small relative to squared expected distance, distances concentrate and nearest/farthest separation disappears.
- Meaningfulness: a nearest-neighbor answer should be accompanied by evidence that many other points are significantly farther than the returned point.
- Counterexample: if dimensions are dependent or data has low intrinsic degrees of freedom, high ambient dimension need not destroy nearest-neighbor meaning.

## Experiments And Evidence Signals
- Simulations show that common high-dimensional workloads can lose distance contrast quickly, often within the first 10-20 dimensions.
- Image-database case studies show that feature dimensionality alone is not a reliable proxy for meaningful similarity.
- The paper emphasizes that high-dimensional index evaluations should include linear scan as a baseline because sophisticated indexes can be misleading when the query answer itself is weak.
- Clustered or low-intrinsic-dimensional workloads can remain meaningful if queries land near well-formed clusters.

## Mapping To Our Three Directions
- RAG-aware allocation: use retrieval score gaps or distance contrast as a decision signal for when to expand retrieval, rerank, verify, or escalate to a stronger model.
- Adaptive retrieval-compute allocation: allocate more compute when many chunks are nearly tied with the top result; take a cheaper path when evidence separation is strong.
- LLM serving allocation: keep simple baselines in evaluations and separate system throughput from evidence meaningfulness.
- Test-time compute budgeting: treat low retrieval contrast as a query-difficulty signal that justifies extra reasoning or verification steps.

## Recommended Handling
- Keep the DB record because it is a useful theory seed.
- Do not claim it completed standard fulltext preprocessing.
- Either implement real OCR for this PDF or keep this artifact as a manual theory-support dossier.
- If the active corpus denominator requires standard fulltext completion, move this item to a deferred theory seed bucket until OCR is implemented.

## Follow-Up: Partial Visual Index
- Decision: option 2 was applied.
- Script: `tools/lit-0252-visual-index.mjs`.
- Apply artifact: `artifacts/20260604T-lit-0252-visual-index-apply.json`.
- Retrieval-check artifact: `artifacts/20260604T-lit-0252-visual-retrieval-check.json`.
- Active embedding version: `b3522d9f-9812-4b30-8342-ee71669f7e3c`.
- Result:
  - 13 summary-level visual chunks.
  - 3072-dimensional OpenAI embeddings.
  - 254 local token-index rows.
  - Scoped standard retrieval route returned `LIT-0252` as rank 1 for a nearest-neighbor distance-contrast query.
- Boundary:
  - `FULLTEXT_PREPROCESSED` remains `BLOCKED`.
  - Standard `INDEXED` remains `NOT_STARTED`.
  - The partial path is recorded through visual stages and `PARTIAL_INDEXED` embedding status.
