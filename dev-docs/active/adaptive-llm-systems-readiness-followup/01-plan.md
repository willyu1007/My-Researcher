# 01 Plan

## Phase 1 - Task Setup
- Status: completed.
- Create the follow-up task bundle for F1/F2.
- Register the task in project governance.
- Preserve T-116 as the completed upstream corpus round.

## Phase 2 - F1 Classic RAG Anchor Import
- Status: completed. See `artifacts/f1-classic-rag-import-report.json`.
- Check whether `arxiv:2005.11401` already exists.
- Fetch exact arXiv metadata for `2005.11401`.
- Import through the existing `/literature/collections/import` boundary.
- Add T-116-compatible tags:
  - `collection:core`
  - `direction:rag-aware-allocation`
  - `subcluster:rag-evaluation-quality`
  - `metric:answer-quality`
  - `priority:p1`
  - `era:classic-pre-2023`
  - `classification:seed`
  - `classification:needs-judgment-card`
  - `batch:f1-import-missing-core-classic`
- Verify no content-processing/fulltext/pipeline side effects.

## Phase 3 - F2 Candidate Set Assembly
- Status: completed. See `artifacts/f2-readiness-targets-manifest.json`.
- Build the F2 target set:
  - 15 experiment-foundation candidates from T-116 Phase 6.
  - Highest-priority P0 current-round research seeds.
  - The imported F1 classic RAG anchor if needed for baseline completeness.
- Record the target list with stable literature IDs, titles, tags, and source URLs.

## Phase 4 - F2 Fulltext/Code/Protocol Readiness
- Status: completed. See `artifacts/f2-fulltext-code-readiness-manifest.json`.
- For each target, inspect metadata and public source signals:
  - fulltext route: arXiv PDF, conference PDF, project page, or unknown.
  - code route: repository, benchmark dataset, toolkit, trace, or none found.
  - protocol route: benchmark/evaluation/run recipe details.
  - license caveat if discoverable.
  - runnable-baseline readiness.
- Do not enqueue fulltext acquisition or content-processing jobs in this pass.

## Phase 5 - Readiness Summary
- Status: completed. See `06-f2-readiness-summary.md`.
- Produce an F2 readiness artifact with:
  - ready-for-experiment-foundation candidates.
  - needs-manual-followup candidates.
  - evidence-active blockers.
  - recommended next task for experiment-foundation promotion.

## Acceptance Criteria
- [x] F1 classic RAG anchor exists with source provenance and T-116-compatible tags.
- [x] F1 import/reconcile side effects are limited to intended literature/source/tag changes.
- [x] F2 target set is explicit and reproducible.
- [x] F2 readiness table covers fulltext, code, protocol, license caveat, and runnable-baseline feasibility.
- [x] No fulltext acquisition, content processing, pipeline run, or embedding/indexing job is created by default.
