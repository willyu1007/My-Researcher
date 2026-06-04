# 03 Implementation Notes

## 2026-06-04 - Task Package Created
- Created `T-118 adaptive-llm-systems-experiment-foundation-promotion`.
- Decision: open a new task instead of extending T-117 because F3 crosses from literature readiness into experiment-foundation candidate review.
- Decision: map to `M-001 > F-001 > R-012`.
- Decision: keep F3 at candidate/review level; do not create canonical assets or RunRecipe records.
- Registered the task through project governance and mapped it from default inbox to `M-001 > F-001 > R-012`.

## 2026-06-04 - F3 Matrix Tool
- Added `tools/f3-experiment-foundation-promotion.mjs`.
- The tool consumes T-117 F2 readiness detail from `.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-fulltext-code-readiness.json`.
- The tool writes:
  - `artifacts/f3-promotion-matrix.json`.
  - `06-f3-promotion-matrix.md`.
- The tool does not write to DB, does not enqueue jobs, and does not clone repositories.

## 2026-06-04 - F3 Promotion Matrix Generated
- Generated a 10-candidate matrix from the T-117 high runnable-feasibility set.
- Candidate family split:
  - benchmark: 1.
  - dataset: 2.
  - baseline: 3.
  - evaluation_protocol: 1.
  - method_component: 3.
- Risk split:
  - low: 8.
  - medium: 2.
- Decision: `auto_promotion_allowed=false` for all rows because duplicate, completeness, policy, version/protocol, and smoke checks are not yet complete.
- Recommended first lane: `LIT-0204` RAGPerf as the benchmark/protocol anchor for RAG-aware resource allocation experiments.

## 2026-06-04 - LIT-0204 RAGPerf Deep Dive
- Added `tools/f3-ragperf-lane-deep-dive.mjs`.
- Generated:
  - `artifacts/lit-0204-ragperf-candidate-payload.json`.
  - `07-lit-0204-ragperf-candidate-payload.md`.
- Split RAGPerf into:
  - benchmark candidate: `RAGPerf RAG Systems Benchmark`.
  - evaluation protocol candidate: `RAGPerf LanceDB Insert/Query Evaluation Protocol`.
  - dataset candidates: Wikipedia corpus slice and Natural Questions query workload.
- Decision: keep all candidates below canonical asset creation because duplicate check, dataset policy, protocol hash, metric/evaluator records, smoke evidence, dependency preflight, local path rewrite, and GPU/model checks are incomplete.
- Evidence boundary: source links, git HEAD, protocol commands, metric requirements, gate blockers, and smoke plan are stored; no repository clone, dataset, model, log, or execution output is stored in repo.
