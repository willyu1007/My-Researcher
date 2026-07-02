# 02 Architecture

## Boundary
- `literature` owns this task.
- The pipeline writes metadata and tags only.
- Experiment asset promotion remains out of scope.

## Standard Pipeline Shape
1. Query catalog selection.
2. Candidate discovery.
3. DB duplicate check.
4. Controlled import.
5. Safety counter verification.
6. Batch summary.

## Data Boundary
- Detailed search results and imports can be stored under `.ai/.tmp`.
- Repo artifacts should stay lightweight: manifests, summaries, and scripts only.
- No raw paper PDFs, fulltext snapshots, repository clones, embeddings, or benchmark outputs in repo.
